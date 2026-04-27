from rest_framework import serializers

from .models import (
    HelpItem,
    HelpSection,
    Language,
    Result,
    TrainingAnalysis,
    UserText,
)
from .services.text_generation import normalize_spaces
from .services.training_security import (
    build_verified_result_payload,
    complete_training_session,
    get_active_training_session,
    validate_session_result_timing,
)


class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = (
            'id',
            'code',
            'name',
            'native_name',
            'flag_emoji',
        )


class ResultSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    language = LanguageSerializer(read_only=True)
    user_text_title = serializers.CharField(source='user_text.title', read_only=True)
    analysis = serializers.SerializerMethodField()

    class Meta:
        model = Result
        fields = (
            'id',
            'username',
            'speed',
            'accuracy',
            'total_time',
            'training_text',
            'language',
            'is_personal_text',
            'user_text_title',
            'text_type',
            'mode',
            'requested_size',
            'words',
            'analysis',
            'created_at',
        )

    def get_analysis(self, obj):
        try:
            analysis = obj.analysis
        except TrainingAnalysis.DoesNotExist:
            return None
        return TrainingAnalysisSerializer(analysis).data


class ResultCreateSerializer(serializers.ModelSerializer):
    session_token = serializers.UUIDField(write_only=True)
    language_code = serializers.SlugRelatedField(
        slug_field='code',
        source='language',
        queryset=Language.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    user_text_id = serializers.PrimaryKeyRelatedField(
        source='user_text',
        queryset=UserText.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Result
        fields = (
            'speed',
            'accuracy',
            'total_time',
            'training_text',
            'session_token',
            'language_code',
            'user_text_id',
            'is_personal_text',
            'words',
        )

    def validate(self, attrs):
        request = self.context.get('request')
        session = get_active_training_session(request, attrs.pop('session_token', None))

        submitted_text = normalize_spaces(attrs.get('training_text', ''))
        if submitted_text and submitted_text != session.training_text:
            raise serializers.ValidationError(
                'Результат не соответствует тексту выданной тренировки.'
            )

        submitted_language = attrs.get('language')
        if submitted_language and submitted_language != session.language:
            raise serializers.ValidationError(
                'Результат не соответствует языку выданной тренировки.'
            )

        submitted_user_text = attrs.get('user_text')
        if submitted_user_text and submitted_user_text != session.user_text:
            raise serializers.ValidationError(
                'Результат не соответствует исходному пользовательскому тексту.'
            )

        if session.user_text:
            if not request or not request.user.is_authenticated:
                raise serializers.ValidationError(
                    'Свой текст доступен только авторизованному пользователю.'
                )
            if session.user_text.user != request.user:
                raise serializers.ValidationError(
                    'Нельзя сохранить результат для чужого текста.'
                )

        verified_result = build_verified_result_payload(
            session.training_text,
            attrs.get('words'),
            attrs.get('total_time'),
        )
        validate_session_result_timing(session, verified_result['total_time'])

        attrs['training_text'] = session.training_text
        attrs['language'] = session.language
        attrs['user_text'] = session.user_text
        attrs['is_personal_text'] = session.is_personal_text
        attrs['text_type'] = session.text_type
        attrs['mode'] = session.mode
        attrs['requested_size'] = session.requested_size
        attrs['speed'] = verified_result['speed']
        attrs['accuracy'] = verified_result['accuracy']
        attrs['total_time'] = verified_result['total_time']
        attrs['words'] = verified_result['words']
        attrs['training_session'] = session

        return attrs

    def create(self, validated_data):
        session = validated_data.pop('training_session')
        result = super().create(validated_data)
        complete_training_session(session)
        return result


class HelpItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = HelpItem
        fields = ('id', 'text')


class HelpSectionSerializer(serializers.ModelSerializer):
    items = HelpItemSerializer(many=True, read_only=True)

    class Meta:
        model = HelpSection
        fields = (
            'id',
            'title',
            'items',
        )


class UserTextSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserText
        fields = (
            'id',
            'title',
            'content',
            'created_at',
            'updated_at',
        )


class TrainingAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingAnalysis
        fields = (
            'analysis_version',
            'headline',
            'focus_area',
            'overall_score',
            'speed_score',
            'accuracy_score',
            'stability_score',
            'completion_score',
            'metrics',
            'strengths',
            'pain_points',
            'recommendations',
        )
