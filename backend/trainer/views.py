from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import permission_classes
from .constants import DEFAULT_TEXT_TYPE, MODE_STANDARD, TEXT_TYPE_USER
from .models import HelpSection, Language, Result, Text, UserText
from .serializers import (
    HelpSectionSerializer,
    LanguageSerializer,
    ResultCreateSerializer,
    ResultSerializer,
    UserTextSerializer,
)
from .services.leaderboard import (
    build_leaderboard_data,
    build_leaderboard_user_detail,
)
from .services.text_generation import (
    build_generated_text,
    get_word_count,
    normalize_spaces,
    parse_bool,
)

User = get_user_model()


@api_view(['GET'])
def random_text(request):
    language_code = request.GET.get('language', 'ru')
    text_type = request.GET.get('text_type', DEFAULT_TEXT_TYPE)
    mode = request.GET.get('mode', MODE_STANDARD)
    raw_size = request.GET.get('size')
    user_text_id = request.GET.get('user_text_id')
    include_punctuation = parse_bool(request.GET.get('punctuation'), default=True)
    include_capitals = parse_bool(request.GET.get('capitals'), default=True)

    texts_queryset = Text.objects.select_related('language').filter(
        language__code__iexact=language_code,
    )

    if text_type == TEXT_TYPE_USER:
        if not request.user.is_authenticated:
            return Response({
                "error": "login required for personal texts"
            }, status=403)
        if not user_text_id:
            return Response({
                "error": "user_text_id is required"
            }, status=400)

        user_text = get_object_or_404(
            UserText,
            id=user_text_id,
            user=request.user,
        )
        return Response({
            "content": normalize_spaces(user_text.content),
            "language": (
                LanguageSerializer(
                    Language.objects.filter(code__iexact=language_code).first()
                ).data
                if Language.objects.filter(code__iexact=language_code).exists()
                else None
            ),
            "text_type": text_type,
            "size": get_word_count(user_text.content),
            "user_text": UserTextSerializer(user_text).data,
        })

    if not texts_queryset.exists():
        return Response({
            "error": (
                f"no texts for language {language_code}"
            )
        }, status=400)

    texts = list(texts_queryset)

    try:
        content, size = build_generated_text(
            text_type,
            texts,
            raw_size,
            include_punctuation=include_punctuation,
            include_capitals=include_capitals,
        )
    except ValueError as error:
        return Response({
            "error": str(error)
        }, status=400)

    return Response({
        "content": content,
        "language": LanguageSerializer(texts[0].language).data,
        "text_type": text_type,
        "size": size,
    })


@api_view(['GET'])
def language_list(request):
    languages = Language.objects.all()
    serializer = LanguageSerializer(languages, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def help_sections(request):
    sections = HelpSection.objects.prefetch_related('items').all()
    serializer = HelpSectionSerializer(sections, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def save_result(request):
    serializer = ResultCreateSerializer(
        data=request.data,
        context={'request': request},
    )
    serializer.is_valid(raise_exception=True)
    result = serializer.save(
        user=request.user if request.user.is_authenticated else None
    )
    return Response(ResultSerializer(result).data, status=201)


@api_view(['GET'])
def leaderboard(request):
    return Response(build_leaderboard_data(User))


@api_view(['GET'])
def leaderboard_user_detail(request, user_id):
    user = get_object_or_404(User, id=user_id)
    return Response(build_leaderboard_user_detail(user))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def history(request):
    results = Result.objects.filter(user=request.user)
    serializer = ResultSerializer(results, many=True)
    return Response(serializer.data)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def history_detail(request, result_id):
    result = get_object_or_404(Result, id=result_id, user=request.user)
    if request.method == 'DELETE':
        result.delete()
        return Response(status=204)
    serializer = ResultSerializer(result)
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def user_texts(request):
    if request.method == 'GET':
        serializer = UserTextSerializer(request.user.trainer_texts.all(), many=True)
        return Response(serializer.data)

    serializer = UserTextSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(user=request.user)
    return Response(serializer.data, status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def user_text_detail(request, text_id):
    user_text = get_object_or_404(UserText, id=text_id, user=request.user)

    if request.method == 'DELETE':
        user_text.delete()
        return Response(status=204)

    serializer = UserTextSerializer(user_text, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
