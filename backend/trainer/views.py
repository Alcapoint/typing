from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import permission_classes
from .constants import (
    DEFAULT_TEXT_TYPE,
    MODE_STANDARD,
    TEXT_TYPE_REPLAY,
    TEXT_TYPE_USER,
)
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
from .services.training_analysis import (
    ensure_result_analysis,
    ensure_result_analyses,
)
from .services.training_security import (
    append_training_session_text,
    create_training_session,
    get_active_training_session,
    restart_training_session as clone_training_session,
    start_training_session as activate_training_session,
    validate_replay_session_request,
)

User = get_user_model()


@api_view(['GET'])
def random_text(request):
    language_code = request.GET.get('language', 'ru')
    text_type = request.GET.get('text_type', DEFAULT_TEXT_TYPE)
    mode = request.GET.get('mode', MODE_STANDARD)
    raw_size = request.GET.get('size')
    user_text_id = request.GET.get('user_text_id')
    session_token = request.GET.get('session_token')
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
            "session_token": str(create_training_session(
                request=request,
                training_text=user_text.content,
                language=Language.objects.filter(code__iexact=language_code).first(),
                text_type=text_type,
                mode=mode,
                requested_size=get_word_count(user_text.content),
                user_text=user_text,
                is_personal_text=True,
            ).token),
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

    normalized_content = normalize_spaces(content)
    active_session = None
    if session_token:
        active_session = get_active_training_session(request, session_token)
        if (
            active_session.language_id != texts[0].language_id
            or active_session.text_type != text_type
            or active_session.mode != mode
            or active_session.user_text_id is not None
        ):
            return Response({
                "error": "session parameters mismatch"
            }, status=400)
        append_training_session_text(active_session, normalized_content)
    else:
        active_session = create_training_session(
            request=request,
            training_text=normalized_content,
            language=texts[0].language,
            text_type=text_type,
            mode=mode,
            requested_size=size,
        )

    return Response({
        "content": normalized_content,
        "language": LanguageSerializer(texts[0].language).data,
        "text_type": text_type,
        "size": size,
        "session_token": str(active_session.token),
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
@permission_classes([IsAuthenticated])
def save_result(request):
    serializer = ResultCreateSerializer(
        data=request.data,
        context={'request': request},
    )
    serializer.is_valid(raise_exception=True)
    result = serializer.save(user=request.user)
    ensure_result_analysis(result)
    return Response(ResultSerializer(result).data, status=201)


@api_view(['POST'])
def start_training_session(request, session_token):
    session = get_active_training_session(request, session_token)
    activate_training_session(session)
    return Response({"session_token": str(session.token), "started": True})


@api_view(['POST'])
def restart_training_session(request, session_token):
    session = clone_training_session(request, session_token)
    return Response({
        "content": session.training_text,
        "session_token": str(session.token),
        "language": LanguageSerializer(session.language).data if session.language else None,
    }, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def replay_training_session(request):
    language = None
    language_code = request.data.get('language_code')
    if language_code:
        language = Language.objects.filter(code__iexact=language_code).first()
        if not language:
            return Response({"error": "unknown language"}, status=400)

    user_text = None
    user_text_id = request.data.get('user_text_id')
    if user_text_id:
        user_text = get_object_or_404(UserText, id=user_text_id, user=request.user)

    normalized_text = validate_replay_session_request(
        request,
        request.data.get('training_text', ''),
        language,
        user_text,
        parse_bool(request.data.get('is_personal_text'), default=False),
    )

    session = create_training_session(
        request=request,
        training_text=normalized_text,
        language=language,
        text_type=TEXT_TYPE_REPLAY,
        mode=request.data.get('mode', MODE_STANDARD),
        requested_size=get_word_count(normalized_text),
        user_text=user_text,
        is_personal_text=bool(user_text or parse_bool(request.data.get('is_personal_text'), default=False)),
    )

    return Response({
        "content": normalized_text,
        "session_token": str(session.token),
        "language": LanguageSerializer(language).data if language else None,
    }, status=201)


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
    results = list(
        Result.objects.select_related('language', 'user_text', 'analysis').filter(
            user=request.user
        )
    )
    ensure_result_analyses(results)
    serializer = ResultSerializer(results, many=True)
    return Response(serializer.data)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def history_detail(request, result_id):
    result = get_object_or_404(
        Result.objects.select_related('language', 'user_text', 'analysis'),
        id=result_id,
        user=request.user,
    )
    if request.method == 'DELETE':
        result.delete()
        return Response(status=204)
    ensure_result_analysis(result)
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
