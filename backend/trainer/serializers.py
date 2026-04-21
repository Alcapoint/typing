from rest_framework import serializers

from .models import HelpItem, HelpSection, Language, Result, UserText


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
            'words',
            'created_at',
        )


class ResultCreateSerializer(serializers.ModelSerializer):
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
            'language_code',
            'user_text_id',
            'is_personal_text',
            'words',
        )

    def validate(self, attrs):
        request = self.context.get('request')
        user_text = attrs.get('user_text')

        if user_text:
            if not request or not request.user.is_authenticated:
                raise serializers.ValidationError(
                    'Свой текст доступен только авторизованному пользователю.'
                )
            if user_text.user != request.user:
                raise serializers.ValidationError(
                    'Нельзя сохранить результат для чужого текста.'
                )
            attrs['is_personal_text'] = True

        return attrs


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
