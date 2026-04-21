import random
import re
from django.contrib.auth import get_user_model
from django.db.models import Count, OuterRef, Subquery
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import permission_classes
from .models import HelpSection, Language, Result, Text, UserText
from .serializers import (
    HelpSectionSerializer,
    LanguageSerializer,
    ResultCreateSerializer,
    ResultSerializer,
    UserTextSerializer,
)

User = get_user_model()

TEXT_TYPE_QUOTE = 'quote'
TEXT_TYPE_CUSTOM = 'custom'
TEXT_TYPE_NONSENSE = 'nonsense'
TEXT_TYPE_RANDOM_WORDS = 'words'
TEXT_TYPE_USER = 'user'
DEFAULT_TEXT_TYPE = TEXT_TYPE_QUOTE
MODE_STANDARD = 'standard'

DEFAULT_TEXT_SIZE = 40
QUOTE_MIN_SIZE = 1
TEXT_MIN_SIZE = 10
TEXT_MAX_SIZE = 600
SENTENCE_SPLIT_PATTERN = re.compile(r'[^.!?…]+[.!?…]*', re.UNICODE)
WORD_PATTERN = re.compile(r'\b\w+\b', re.UNICODE)


def normalize_spaces(value):
    return re.sub(r'\s+', ' ', value or '').strip()


def parse_bool(value, default=False):
    if value is None:
        return default
    return str(value).lower() in {'1', 'true', 'yes', 'on'}


def clamp_int(value, default, min_value, max_value):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    return max(min_value, min(parsed, max_value))


def split_sentences(content):
    sentences = [
        normalize_spaces(sentence)
        for sentence in SENTENCE_SPLIT_PATTERN.findall(content or '')
        if normalize_spaces(sentence)
    ]
    return sentences or ([normalize_spaces(content)] if normalize_spaces(content) else [])


def get_word_count(content):
    return len(WORD_PATTERN.findall(content or ''))


def sanitize_word_pool(texts):
    words = []
    for text in texts:
        normalized = normalize_spaces((text.content or '').lower())
        cleaned = re.sub(r'[^\w\s]', ' ', normalized, flags=re.UNICODE)
        words.extend(
            word for word in cleaned.split()
            if any(char.isalpha() for char in word)
        )
    return words


def transform_custom_source(content, include_punctuation=True, include_capitals=True):
    transformed = normalize_spaces(content)
    if not include_capitals:
        transformed = transformed.lower()
    if not include_punctuation:
        transformed = re.sub(r'[^\w\s]', ' ', transformed, flags=re.UNICODE)
        transformed = normalize_spaces(transformed)
    return transformed


def slice_text_by_word_count(content, word_count):
    matches = list(WORD_PATTERN.finditer(content or ''))
    if not matches:
        return ''
    if len(matches) <= word_count:
        return normalize_spaces(content)

    start_index = random.randint(0, len(matches) - word_count)
    start = matches[start_index].start()
    end = matches[start_index + word_count - 1].end()
    return normalize_spaces(content[start:end])


def build_quote_text(texts, sentence_count=None, target_word_count=None):
    sources = [text for text in texts if split_sentences(text.content)]
    if not sources:
        return ''

    if target_word_count:
        eligible_sources = [
            text for text in sources
            if get_word_count(text.content) >= target_word_count
        ] or sources
        source = random.choice(eligible_sources)
        sentences = split_sentences(source.content)

        if not sentences:
            return ''

        start_index = random.randint(0, len(sentences) - 1)
        selected_sentences = []
        collected_words = 0

        for sentence in sentences[start_index:]:
            selected_sentences.append(sentence)
            collected_words += get_word_count(sentence)
            if collected_words >= target_word_count:
                break

        if collected_words < target_word_count and start_index > 0:
            for sentence in reversed(sentences[:start_index]):
                selected_sentences.insert(0, sentence)
                collected_words += get_word_count(sentence)
                if collected_words >= target_word_count:
                    break

        return ' '.join(selected_sentences)

    eligible_sources = [
        text for text in sources
        if len(split_sentences(text.content)) >= sentence_count
    ] or sources
    source = random.choice(eligible_sources)
    sentences = split_sentences(source.content)

    if len(sentences) <= sentence_count:
        return ' '.join(sentences)

    start_index = random.randint(0, len(sentences) - sentence_count)
    return ' '.join(sentences[start_index:start_index + sentence_count])


def build_custom_text(
    texts,
    word_count,
    include_punctuation=True,
    include_capitals=True,
):
    sources = [
        transform_custom_source(
            text.content,
            include_punctuation=include_punctuation,
            include_capitals=include_capitals,
        )
        for text in texts
    ]
    sources = [source for source in sources if source]
    if not sources:
        return ''

    eligible_sources = [
        source for source in sources
        if len(WORD_PATTERN.findall(source)) >= word_count
    ] or sources
    source = random.choice(eligible_sources)
    return slice_text_by_word_count(source, word_count)


def build_random_words_text(texts, word_count):
    word_pool = sanitize_word_pool(texts)
    if not word_pool:
        return ''
    return ' '.join(random.choice(word_pool) for _ in range(word_count))


def blend_words(first_word, second_word):
    if not first_word and not second_word:
        return ''

    first_cut = max(1, len(first_word) // 2)
    second_cut = max(1, len(second_word) // 2)
    combined = f'{first_word[:first_cut]}{second_word[-second_cut:]}'

    if combined in {first_word, second_word} or len(combined) < 4:
        prefix = first_word[:max(1, (len(first_word) * 2) // 3)]
        suffix = second_word[max(1, len(second_word) // 3):]
        combined = f'{prefix}{suffix}'

    return combined.lower()


def build_nonsense_text(texts, word_count):
    word_pool = sanitize_word_pool(texts)
    if not word_pool:
        return ''
    if len(word_pool) == 1:
        word_pool = word_pool * 2

    generated_words = []
    for _ in range(word_count):
        first_word, second_word = random.sample(word_pool, 2)
        generated_words.append(blend_words(first_word, second_word))

    return ' '.join(generated_words)


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

    if text_type == TEXT_TYPE_QUOTE:
        size = clamp_int(raw_size, 25, QUOTE_MIN_SIZE, 600)
        content = build_quote_text(texts, target_word_count=size)
    elif text_type == TEXT_TYPE_CUSTOM:
        size = clamp_int(raw_size, DEFAULT_TEXT_SIZE, TEXT_MIN_SIZE, TEXT_MAX_SIZE)
        content = build_custom_text(
            texts,
            size,
            include_punctuation=include_punctuation,
            include_capitals=include_capitals,
        )
    elif text_type == TEXT_TYPE_NONSENSE:
        size = clamp_int(raw_size, DEFAULT_TEXT_SIZE, TEXT_MIN_SIZE, TEXT_MAX_SIZE)
        content = build_nonsense_text(texts, size)
    elif text_type == TEXT_TYPE_RANDOM_WORDS:
        size = clamp_int(raw_size, DEFAULT_TEXT_SIZE, TEXT_MIN_SIZE, TEXT_MAX_SIZE)
        content = build_random_words_text(texts, size)
    else:
        return Response({
            "error": f"unsupported text type {text_type}"
        }, status=400)

    if not content:
        return Response({
            "error": "unable to build text for selected settings"
        }, status=400)

    return Response({
        "content": normalize_spaces(content),
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
    best_result_queryset = (
        Result.objects.filter(
            user=OuterRef('pk'),
            is_personal_text=False,
        )
        .order_by('-speed', '-accuracy', '-created_at')
    )

    top_users = (
        User.objects.filter(
            results__isnull=False,
            results__is_personal_text=False,
        )
        .annotate(
            best_result_id=Subquery(best_result_queryset.values('id')[:1]),
            best_speed=Subquery(best_result_queryset.values('speed')[:1]),
            best_accuracy=Subquery(best_result_queryset.values('accuracy')[:1]),
            best_date=Subquery(best_result_queryset.values('created_at')[:1]),
        )
        .order_by('-best_speed', '-best_accuracy', '-best_date')
        .distinct()
        [:10]
    )

    data = [
        {
            "id": user.best_result_id,
            "user_id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "speed": user.best_speed,
            "accuracy": user.best_accuracy,
            "date": user.best_date,
        }
        for user in top_users
    ]

    return Response(data)


@api_view(['GET'])
def leaderboard_user_detail(request, user_id):
    user = get_object_or_404(User, id=user_id)
    user_results = Result.objects.filter(
        user=user,
        is_personal_text=False,
    ).select_related('language')

    top_results = list(
        user_results.order_by('-speed', '-accuracy', '-created_at')[:3]
    )
    best_result = top_results[0] if top_results else None

    favorite_language = (
        Language.objects.filter(results__user=user)
        .annotate(training_count=Count('results'))
        .order_by('-training_count', 'sort_order', 'native_name')
        .first()
    )

    data = {
        "user": {
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "avatar": user.avatar.url if user.avatar else None,
        },
        "total_trainings": user_results.count(),
        "favorite_language": (
            {
                **LanguageSerializer(favorite_language).data,
                "training_count": favorite_language.training_count,
            }
            if favorite_language else None
        ),
        "top_trainings": [
            {
                "id": result.id,
                "speed": result.speed,
                "accuracy": result.accuracy,
                "total_time": result.total_time,
                "created_at": result.created_at,
                "language": (
                    LanguageSerializer(result.language).data
                    if result.language else None
                ),
            }
            for result in top_results
        ],
        "best_training": (
            ResultSerializer(best_result).data
            if best_result else None
        ),
    }

    return Response(data)


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
