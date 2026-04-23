import random
import re

from ..constants import (
    DEFAULT_TEXT_SIZE,
    QUOTE_MIN_SIZE,
    TEXT_MAX_SIZE,
    TEXT_MIN_SIZE,
    TEXT_TYPE_CUSTOM,
    TEXT_TYPE_NONSENSE,
    TEXT_TYPE_QUOTE,
    TEXT_TYPE_RANDOM_WORDS,
)

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


def build_generated_text(
    text_type,
    texts,
    raw_size,
    include_punctuation=True,
    include_capitals=True,
):
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
        raise ValueError(f"unsupported text type {text_type}")

    if not content:
        raise ValueError("unable to build text for selected settings")

    return normalize_spaces(content), size
