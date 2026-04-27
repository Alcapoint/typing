from statistics import median

from ..models import TrainingAnalysis

ANALYSIS_VERSION = 'v4'
REFERENCE_WPM_BY_MODE = {
    'standard': 80,
    'time': 75,
    'mistake': 70,
}
MAX_INSIGHT_ITEMS = 3
MAX_WORD_EXAMPLES = 5
MAX_PATTERN_EXAMPLES = 5
SEGMENT_LABELS = ('start', 'middle', 'finish')
POSITION_ZONE_LABELS = ('start', 'middle', 'finish')
METRIC_LABELS = {
    'accuracy': 'точность',
    'clean_run': 'чистые серии',
    'speed': 'скорость',
    'speed_control': 'контроль ускорения',
    'rhythm': 'ритм',
    'endurance': 'выносливость',
    'recovery': 'восстановление после ошибки',
    'hard_words': 'сложные слова',
    'completion': 'завершение объёма',
}


def clamp(value, minimum=0, maximum=100):
    return max(minimum, min(maximum, value))


def safe_round(value, digits=1):
    return round(float(value or 0), digits)


def average(values):
    if not values:
        return 0
    return sum(values) / len(values)


def percent(value, digits=1):
    return safe_round(float(value or 0) * 100, digits)


def describe_band(score):
    if score >= 90:
        return 'elite', 'Высокая точность и устойчивый темп'
    if score >= 80:
        return 'excellent', 'Стабильный результат с хорошим контролем'
    if score >= 68:
        return 'good', 'Рабочий уровень с локальными отклонениями'
    if score >= 55:
        return 'steady', 'Базовый уровень сформирован, но метрики неоднородны'
    return 'needs_work', 'Результат нестабилен по точности и ритму'


def get_reference_wpm(mode):
    return REFERENCE_WPM_BY_MODE.get(mode, 80)


def get_word_accuracy(word):
    correct = str(word.get('correct', ''))
    typed = str(word.get('typed', ''))
    max_length = max(len(correct), len(typed), 1)
    errors = int(word.get('errors', 0) or 0)
    return clamp(((max_length - errors) / max_length) * 100)


def get_error_zone(index, length):
    if length <= 1:
        return 'middle'
    ratio = index / max(length - 1, 1)
    if ratio <= 0.33:
        return 'start'
    if ratio >= 0.67:
        return 'finish'
    return 'middle'


def quote_word(value):
    return f'«{value}»'


def format_word_example(word):
    typed = word.get('typed') or '—'
    return f"{quote_word(word.get('correct', ''))} -> {quote_word(typed)}"


def join_word_examples(words, limit=3):
    examples = [quote_word(word.get('correct', '')) for word in words[:limit] if word.get('correct')]
    return ', '.join(examples)


def join_labels(labels):
    items = [str(label) for label in labels if label]
    if not items:
        return ''
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f'{items[0]} и {items[1]}'
    return f"{', '.join(items[:-1])} и {items[-1]}"


def get_typed_words(words):
    typed_words = []
    for word in words:
        typed = str(word.get('typed', ''))
        duration = float(word.get('duration', 0) or 0)
        if typed or duration > 0:
            typed_words.append(word)
    return typed_words


def build_annotated_words(words):
    annotated = []

    for index, raw_word in enumerate(words):
        correct = str(raw_word.get('correct', ''))
        typed = str(raw_word.get('typed', ''))
        duration = float(raw_word.get('duration', 0) or 0)
        wpm = int(raw_word.get('wpm', 0) or 0)
        cpm = int(raw_word.get('cpm', 0) or 0)
        errors = int(raw_word.get('errors', 0) or 0)
        length = len(correct)
        max_length = max(len(correct), len(typed), 1)
        accuracy = get_word_accuracy(raw_word)
        mismatch_zones = {label: 0 for label in POSITION_ZONE_LABELS}
        mismatch_pairs = {}

        for char_index in range(max(len(correct), len(typed))):
            expected = correct[char_index] if char_index < len(correct) else ''
            actual = typed[char_index] if char_index < len(typed) else ''
            if expected == actual:
                continue

            zone = get_error_zone(char_index, max_length)
            mismatch_zones[zone] += 1
            key = (expected or '∅', actual or '∅')
            mismatch_pairs[key] = mismatch_pairs.get(key, 0) + 1

        has_punctuation = any(not char.isalnum() for char in correct)
        has_capital = any(char.isalpha() and char != char.lower() for char in correct)

        annotated.append({
            'index': index,
            'correct': correct,
            'typed': typed,
            'duration': duration,
            'wpm': wpm,
            'cpm': cpm,
            'errors': errors,
            'length': length,
            'accuracy': accuracy,
            'has_error': errors > 0,
            'completion_ratio': min(1, len(typed) / max(length, 1)),
            'has_punctuation': has_punctuation,
            'has_capital': has_capital,
            'is_long': length >= 8,
            'is_short': length <= 4,
            'is_complex': has_punctuation or has_capital or length >= 8,
            'mismatch_zones': mismatch_zones,
            'mismatch_pairs': mismatch_pairs,
        })

    return annotated


def build_segments(words):
    if not words:
        return []

    total_words = len(words)
    segments = []

    for index, label in enumerate(SEGMENT_LABELS):
        start = round(index * total_words / len(SEGMENT_LABELS))
        end = round((index + 1) * total_words / len(SEGMENT_LABELS))
        chunk = words[start:end]
        if not chunk:
            continue

        hardest_word = max(
            chunk,
            key=lambda word: (word['errors'], word['duration'], -word['wpm']),
        )
        clean_words = [word for word in chunk if not word['has_error']]

        segments.append({
            'label': label,
            'words_count': len(chunk),
            'avg_wpm': round(average([word['wpm'] for word in chunk])),
            'avg_accuracy': safe_round(average([word['accuracy'] for word in chunk])),
            'error_free_ratio_percent': percent(
                len(clean_words) / len(chunk),
                1,
            ),
            'hardest_word': {
                'correct': hardest_word['correct'],
                'typed': hardest_word['typed'],
                'errors': hardest_word['errors'],
                'wpm': hardest_word['wpm'],
            },
        })

    return segments


def build_error_patterns(words):
    patterns = {}

    for word in words:
        for pair, count in word['mismatch_pairs'].items():
            bucket = patterns.setdefault(pair, {
                'expected': pair[0],
                'actual': pair[1],
                'count': 0,
                'examples': [],
            })
            bucket['count'] += count
            if len(bucket['examples']) < 3:
                bucket['examples'].append({
                    'correct': word['correct'],
                    'typed': word['typed'],
                })

    pattern_list = sorted(
        patterns.values(),
        key=lambda item: (-item['count'], item['expected'], item['actual']),
    )[:MAX_PATTERN_EXAMPLES]

    for pattern in pattern_list:
        pattern['label'] = f"{pattern['expected']} -> {pattern['actual']}"

    return pattern_list


def build_difficult_words(words, avg_wpm, avg_duration):
    difficult_words = []

    for word in words:
        slow_penalty = max(avg_wpm - word['wpm'], 0)
        duration_penalty = max(word['duration'] - avg_duration, 0)
        severity = (
            (word['errors'] * 26)
            + (slow_penalty * 0.55)
            + (duration_penalty * 16)
        )

        if (
            not word['has_error']
            and word['wpm'] >= avg_wpm * 0.85
            and word['duration'] <= avg_duration * 1.15
        ):
            continue

        difficult_words.append({
            'correct': word['correct'],
            'typed': word['typed'],
            'errors': word['errors'],
            'duration': safe_round(word['duration'], 2),
            'wpm': word['wpm'],
            'accuracy': safe_round(word['accuracy'], 1),
            'severity': safe_round(severity, 1),
        })

    return sorted(
        difficult_words,
        key=lambda item: (-item['severity'], -item['errors'], item['wpm']),
    )[:MAX_WORD_EXAMPLES]


def build_strongest_words(words, avg_wpm):
    strong_words = [
        {
            'correct': word['correct'],
            'typed': word['typed'],
            'errors': word['errors'],
            'duration': safe_round(word['duration'], 2),
            'wpm': word['wpm'],
            'accuracy': safe_round(word['accuracy'], 1),
        }
        for word in words
        if not word['has_error'] and word['wpm'] >= avg_wpm
    ]
    return sorted(
        strong_words,
        key=lambda item: (-item['wpm'], item['duration']),
    )[:MAX_WORD_EXAMPLES]


def build_hesitation_words(words, avg_wpm, avg_duration):
    hesitant = []
    for word in words:
        if word['has_error']:
            continue
        if word['duration'] <= avg_duration * 1.3 and word['wpm'] >= avg_wpm * 0.85:
            continue
        hesitant.append({
            'correct': word['correct'],
            'typed': word['typed'],
            'duration': safe_round(word['duration'], 2),
            'wpm': word['wpm'],
            'accuracy': safe_round(word['accuracy'], 1),
        })

    return sorted(
        hesitant,
        key=lambda item: (-item['duration'], item['wpm']),
    )[:MAX_WORD_EXAMPLES]


def build_rushed_words(words, avg_wpm):
    rushed = []
    for word in words:
        if not word['has_error'] or word['wpm'] < avg_wpm * 1.03:
            continue
        rushed.append({
            'correct': word['correct'],
            'typed': word['typed'],
            'errors': word['errors'],
            'duration': safe_round(word['duration'], 2),
            'wpm': word['wpm'],
            'accuracy': safe_round(word['accuracy'], 1),
        })

    return sorted(
        rushed,
        key=lambda item: (-item['wpm'], -item['errors']),
    )[:MAX_WORD_EXAMPLES]


def build_error_bursts(words):
    bursts = []
    current = []

    for word in words:
        if word['has_error']:
            current.append(word)
            continue

        if len(current) >= 2:
            bursts.append(list(current))
        current = []

    if len(current) >= 2:
        bursts.append(list(current))

    normalized = []
    for burst in bursts[:MAX_WORD_EXAMPLES]:
        normalized.append({
            'words_count': len(burst),
            'words': [word['correct'] for word in burst],
            'avg_wpm': round(average([word['wpm'] for word in burst])),
            'avg_accuracy': safe_round(average([word['accuracy'] for word in burst])),
        })
    return normalized


def build_length_breakdown(words):
    buckets = (
        ('short', 'Короткие', lambda word: word['length'] <= 4),
        ('medium', 'Средние', lambda word: 5 <= word['length'] <= 7),
        ('long', 'Длинные', lambda word: word['length'] >= 8),
    )

    breakdown = []
    for bucket_id, label, matcher in buckets:
        bucket_words = [word for word in words if matcher(word)]
        if not bucket_words:
            continue
        clean_words = [word for word in bucket_words if not word['has_error']]
        breakdown.append({
            'id': bucket_id,
            'label': label,
            'words_count': len(bucket_words),
            'avg_wpm': round(average([word['wpm'] for word in bucket_words])),
            'avg_accuracy': safe_round(average([word['accuracy'] for word in bucket_words])),
            'error_free_ratio_percent': percent(len(clean_words) / len(bucket_words), 1),
        })

    return breakdown


def build_position_distribution(words):
    total = {label: 0 for label in POSITION_ZONE_LABELS}
    total_errors = 0

    for word in words:
        for label, value in word['mismatch_zones'].items():
            total[label] += value
            total_errors += value

    distribution = {}
    for label, value in total.items():
        distribution[label] = {
            'count': value,
            'percent': percent(value / total_errors, 1) if total_errors else 0,
        }
    return distribution


def build_streak_stats(words):
    longest_clean_streak = 0
    longest_error_streak = 0
    current_clean = 0
    current_error = 0

    for word in words:
        if word['has_error']:
            current_error += 1
            current_clean = 0
        else:
            current_clean += 1
            current_error = 0

        longest_clean_streak = max(longest_clean_streak, current_clean)
        longest_error_streak = max(longest_error_streak, current_error)

    return {
        'longest_clean_streak': longest_clean_streak,
        'longest_error_streak': longest_error_streak,
    }


def build_recovery_stats(words, avg_wpm):
    opportunities = []
    recovered_count = 0
    speed_drop_total = 0

    for index, word in enumerate(words[:-1]):
        if not word['has_error']:
            continue

        next_word = words[index + 1]
        recovered = (
            not next_word['has_error']
            and next_word['accuracy'] >= 95
            and next_word['wpm'] >= avg_wpm * 0.82
        )
        if recovered:
            recovered_count += 1

        speed_drop_total += max(word['wpm'] - next_word['wpm'], 0)
        opportunities.append({
            'after': word['correct'],
            'next': next_word['correct'],
            'recovered': recovered,
            'next_wpm': next_word['wpm'],
            'next_accuracy': safe_round(next_word['accuracy'], 1),
        })

    opportunities_count = len(opportunities)
    recovery_ratio = (
        recovered_count / opportunities_count
        if opportunities_count else 1
    )
    average_speed_drop = (
        speed_drop_total / opportunities_count
        if opportunities_count else 0
    )

    weak_examples = [
        example for example in opportunities
        if not example['recovered']
    ][:3]
    good_examples = [
        example for example in opportunities
        if example['recovered']
    ][:3]

    return {
        'opportunities_count': opportunities_count,
        'recovery_ratio': recovery_ratio,
        'average_speed_drop': safe_round(average_speed_drop),
        'weak_examples': weak_examples,
        'good_examples': good_examples,
    }


def append_item(collection, title, description):
    if any(item['title'] == title for item in collection):
        return
    if len(collection) >= MAX_INSIGHT_ITEMS:
        return
    collection.append({
        'title': title,
        'description': description,
    })


def build_scorecard(card_id, label, score, headline, reasons):
    normalized_reasons = [reason for reason in reasons if reason][:3]
    return {
        'id': card_id,
        'label': label,
        'score': clamp(round(score)),
        'headline': headline,
        'reasons': normalized_reasons,
    }


def build_focus_area(scorecards):
    if not scorecards:
        return 'accuracy'
    weakest = min(scorecards, key=lambda card: card['score'])
    return weakest['id']


def build_headline(overall_score, focus_area):
    if overall_score >= 88:
        return 'Высокая устойчивость и контроль'
    if overall_score >= 76:
        return f"Стабильный результат, приоритет — {METRIC_LABELS.get(focus_area, 'ключевые метрики')}"
    if overall_score >= 60:
        return f"Рабочий результат, ограничение — {METRIC_LABELS.get(focus_area, 'ключевые метрики')}"
    return f"Основное ограничение — {METRIC_LABELS.get(focus_area, 'ключевые метрики')}"


def build_coach_note(context):
    metric_scores = {
        'accuracy': context['accuracy_score'],
        'clean_run': context['clean_run_score'],
        'speed': context['speed_score'],
        'speed_control': context['speed_control_score'],
        'rhythm': context['rhythm_score'],
        'endurance': context['endurance_score'],
        'recovery': context['recovery_score'],
        'hard_words': context['hard_words_score'],
        'completion': context['completion_score'],
    }
    sorted_metrics = sorted(metric_scores.items(), key=lambda item: item[1])
    strong_metrics = [
        METRIC_LABELS[metric_id]
        for metric_id, score in sorted(
            metric_scores.items(),
            key=lambda item: item[1],
            reverse=True,
        )
        if score >= 78
    ][:2]
    weak_metrics = [
        METRIC_LABELS[metric_id]
        for metric_id, _score in sorted_metrics[:2]
    ]

    if strong_metrics:
        first_sentence = f"Рабочий диапазон сохраняется по метрикам: {join_labels(strong_metrics)}."
    else:
        first_sentence = 'Ключевые метрики требуют дополнительной стабилизации.'

    if context['completion_score'] < 75:
        second_sentence = 'Целевой объём тренировки пройден не полностью.'
    elif context['pace_drop_percent'] > 10 and context['endurance_score'] < 75:
        second_sentence = f"Приоритет дальнейшей работы — {join_labels(weak_metrics)}; во второй половине тренировки снижается устойчивость."
    else:
        second_sentence = f"Приоритет дальнейшей работы — {join_labels(weak_metrics)}."

    return f'{first_sentence} {second_sentence}'


def build_insights(result, context):
    strengths = []
    pain_points = []
    recommendations = []

    accuracy_score = context['accuracy_score']
    clean_run_score = context['clean_run_score']
    rhythm_score = context['rhythm_score']
    endurance_score = context['endurance_score']
    recovery_score = context['recovery_score']
    hard_words_score = context['hard_words_score']
    speed_control_score = context['speed_control_score']
    completion_score = context['completion_score']
    difficult_words = context['difficult_words']
    strongest_words = context['strongest_words']
    hesitation_words = context['hesitation_words']
    rushed_words = context['rushed_words']
    error_patterns = context['error_patterns']
    recovery_stats = context['recovery_stats']
    pace_drop_percent = context['pace_drop_percent']

    if accuracy_score >= 95:
        append_item(
            strengths,
            'Высокая символьная точность',
            f"Основная часть текста набрана без существенных отклонений. Стабильные примеры: {join_word_examples(strongest_words, 2) or 'ключевые слова текущего прохода'}.",
        )
    if clean_run_score >= 78:
        append_item(
            strengths,
            'Стабильные безошибочные серии',
            'Зафиксированы продолжительные участки без ошибок и резких просадок качества.',
        )
    if speed_control_score >= 75:
        append_item(
            strengths,
            'Контроль ускорения',
            'На повышенном темпе точность сохраняется в рабочем диапазоне.',
        )

    if accuracy_score < 90:
        lead_word = difficult_words[0]['correct'] if difficult_words else 'несколько слов из прохода'
        append_item(
            pain_points,
            'Снижение точности',
            f"Ошибки в словах типа {quote_word(lead_word)} дали наибольший вклад в снижение итоговой оценки.",
        )
        append_item(
            recommendations,
            'Снижение рабочего темпа',
            'Рекомендуется уменьшить рабочий темп на 5-10% и повторить проблемные слова до стабильного результата.',
        )

    if rhythm_score < 68:
        append_item(
            pain_points,
            'Неравномерный ритм',
            'Темп изменяется слишком резко от слова к слову, что снижает устойчивость набора.',
        )
        append_item(
            recommendations,
            'Выравнивание ритма',
            'Рекомендуются короткие серии по 20-30 слов с фиксированным темпом без попытки ускорения.',
        )

    if endurance_score < 68 and pace_drop_percent > 8:
        append_item(
            pain_points,
            'Снижение темпа к финишу',
            f"На финальном участке зафиксировано снижение темпа примерно на {safe_round(pace_drop_percent)}%.",
        )
        append_item(
            recommendations,
            'Контроль финального отрезка',
            'Рекомендуются тексты средней длины с отдельным контролем последней трети дистанции.',
        )

    if recovery_score < 65 and recovery_stats['opportunities_count']:
        weak_example = recovery_stats['weak_examples'][0] if recovery_stats['weak_examples'] else None
        description = 'После ошибки следующий элемент часто выполняется с дополнительным снижением качества.'
        if weak_example:
            description = (
                f"После ошибки на {quote_word(weak_example['after'])} последующее слово "
                f"{quote_word(weak_example['next'])} также было выполнено ниже рабочего уровня."
            )
        append_item(
            pain_points,
            'Замедленное восстановление после ошибки',
            description,
        )
        append_item(
            recommendations,
            'Восстановление после ошибки',
            'После ошибки рекомендуется сначала вернуть точность на следующем слове и только затем восстанавливать темп.',
        )

    if hard_words_score < 70 and difficult_words:
        append_item(
            pain_points,
            'Сложные слова',
            f"На словах {join_word_examples(difficult_words, 3)} одновременно увеличиваются время набора и число ошибок.",
        )
        append_item(
            recommendations,
            'Отработка сложных слов',
            'Рекомендуется сформировать отдельный набор из 5-10 проблемных слов и отработать его вне основной тренировки.',
        )

    if rushed_words:
        append_item(
            pain_points,
            'Потеря контроля при ускорении',
            f"Ошибки чаще возникают в фазе ускорения, в том числе на {join_word_examples(rushed_words, 2)}.",
        )

    if hesitation_words:
        append_item(
            recommendations,
            'Ускорение стабильных слов',
            f"Для слов {join_word_examples(hesitation_words, 2)} допустимо повышение темпа без заметного риска для точности.",
        )

    if error_patterns and error_patterns[0]['count'] >= 2:
        pattern = error_patterns[0]
        append_item(
            recommendations,
            'Коррекция повторяющегося паттерна',
            f"Рекомендуется отдельное упражнение на сочетание {quote_word(pattern['label'])}.",
        )

    if result.mode == 'time' and completion_score < 75:
        append_item(
            recommendations,
            'Старт в режиме на время',
            'Рекомендуются короткие тайм-сеты с акцентом на выход на рабочий темп в первые секунды.',
        )

    if not strengths:
        append_item(
            strengths,
            'Определены устойчивые элементы',
            'Анализ фиксирует участки, на которые можно опираться при дальнейшем росте темпа.',
        )
    if not pain_points:
        append_item(
            pain_points,
            'Критические отклонения не зафиксированы',
            'Основные метрики находятся в рабочем диапазоне. Дальнейшее улучшение связано с точечной настройкой.',
        )
    if not recommendations:
        append_item(
            recommendations,
            'Повторение текущего формата',
            'Рекомендуется закрепить текущий режим ещё в нескольких проходах.',
        )

    return strengths, pain_points, recommendations


def build_result_analysis_payload(result):
    source_words = list(result.words or [])
    typed_words = build_annotated_words(get_typed_words(source_words))
    typed_input = ' '.join(str(word.get('typed', '')) for word in source_words).strip()
    typed_words_count = len(typed_words)
    source_words_count = len((result.training_text or '').split())

    word_wpms = [word['wpm'] for word in typed_words]
    word_accuracies = [word['accuracy'] for word in typed_words]
    word_durations = [word['duration'] for word in typed_words]
    total_char_errors = sum(word['errors'] for word in typed_words)
    total_word_errors = sum(1 for word in typed_words if word['has_error'])
    avg_word_wpm = average(word_wpms)
    median_word_wpm = median(word_wpms) if word_wpms else 0
    avg_word_duration = average(word_durations)
    median_word_duration = median(word_durations) if word_durations else 0
    average_word_accuracy = average(word_accuracies)
    error_free_ratio = (
        sum(1 for word in typed_words if not word['has_error']) / typed_words_count
        if typed_words_count else 0
    )
    word_error_ratio = (
        total_word_errors / typed_words_count
        if typed_words_count else 0
    )

    segments = build_segments(typed_words)
    difficult_words = build_difficult_words(typed_words, avg_word_wpm, avg_word_duration)
    strongest_words = build_strongest_words(typed_words, avg_word_wpm)
    hesitation_words = build_hesitation_words(typed_words, avg_word_wpm, avg_word_duration)
    rushed_words = build_rushed_words(typed_words, avg_word_wpm)
    error_patterns = build_error_patterns(typed_words)
    error_bursts = build_error_bursts(typed_words)
    length_breakdown = build_length_breakdown(typed_words)
    position_distribution = build_position_distribution(typed_words)
    streaks = build_streak_stats(typed_words)
    recovery_stats = build_recovery_stats(typed_words, avg_word_wpm)

    variance = 0
    if len(word_wpms) > 1 and avg_word_wpm > 0:
        variance = sum((wpm - avg_word_wpm) ** 2 for wpm in word_wpms) / len(word_wpms)
    stability_cv = ((variance ** 0.5) / avg_word_wpm) if avg_word_wpm > 0 else 1

    consecutive_jumps = []
    for previous, current in zip(typed_words, typed_words[1:]):
        consecutive_jumps.append(abs(current['wpm'] - previous['wpm']))
    average_jump = average(consecutive_jumps)

    start_wpm = segments[0]['avg_wpm'] if segments else 0
    finish_wpm = segments[-1]['avg_wpm'] if segments else 0
    start_accuracy = segments[0]['avg_accuracy'] if segments else 100
    finish_accuracy = segments[-1]['avg_accuracy'] if segments else 100
    pace_drop_percent = (
        max(0, ((start_wpm - finish_wpm) / start_wpm) * 100)
        if start_wpm > 0 else 0
    )
    accuracy_drop = max(0, start_accuracy - finish_accuracy)

    completion_ratio = 1
    if result.mode == 'mistake':
        completion_ratio = 1 if typed_input else 0
    elif result.mode == 'time':
        target_words = max(int(result.requested_size or 0), 1)
        completion_ratio = min(1, typed_words_count / target_words)
    else:
        target_chars = max(len(result.training_text or ''), 1)
        completion_ratio = min(1, len(typed_input) / target_chars)

    reference_wpm = get_reference_wpm(result.mode)
    speed_score = clamp(round((result.speed / reference_wpm) * 100))
    accuracy_score = clamp(round(result.accuracy))
    clean_run_score = clamp(round(
        (error_free_ratio * 70)
        + ((streaks['longest_clean_streak'] / max(typed_words_count, 1)) * 30)
    ))
    rhythm_score = clamp(round(
        100
        - (min(stability_cv, 1.35) * 40)
        - (min(average_jump, 55) * 0.85)
    ))
    endurance_score = clamp(round(
        ((100 - min(pace_drop_percent, 42) * 1.65) * 0.7)
        + ((100 - min(accuracy_drop, 16) * 4.0) * 0.3)
    ))

    recovery_ratio = recovery_stats['recovery_ratio']
    recovery_score = clamp(round(
        (recovery_ratio * 100)
        - (recovery_stats['average_speed_drop'] * 0.7)
        + (12 if recovery_stats['opportunities_count'] else 0)
    ))
    if not recovery_stats['opportunities_count']:
        recovery_score = 100 if accuracy_score >= 96 else 78

    complex_words = [word for word in typed_words if word['is_complex']]
    if complex_words:
        complex_accuracy = average([word['accuracy'] for word in complex_words])
        complex_error_free_ratio = average(
            [0 if word['has_error'] else 100 for word in complex_words]
        )
        hard_words_score = clamp(round(
            (complex_accuracy * 0.65)
            + (complex_error_free_ratio * 0.35)
            - max(0, accuracy_score - complex_accuracy) * 0.4
        ))
    else:
        complex_accuracy = accuracy_score
        complex_error_free_ratio = error_free_ratio * 100
        hard_words_score = clamp(round((accuracy_score * 0.7) + (error_free_ratio * 30)))

    sorted_wpms = sorted(word_wpms)
    fast_threshold = (
        sorted_wpms[max(int(len(sorted_wpms) * 0.75) - 1, 0)]
        if sorted_wpms else 0
    )
    fast_words = [word for word in typed_words if word['wpm'] >= fast_threshold] if fast_threshold else []
    fast_words_accuracy = average([word['accuracy'] for word in fast_words]) if fast_words else accuracy_score
    fast_clean_ratio = average([0 if word['has_error'] else 100 for word in fast_words]) if fast_words else error_free_ratio * 100
    rushed_ratio = (
        len(rushed_words) / len(fast_words)
        if fast_words else 0
    )
    speed_control_score = clamp(round(
        (fast_words_accuracy * 0.62)
        + (fast_clean_ratio * 0.28)
        + 10
        - (rushed_ratio * 32)
    ))

    completion_score = clamp(round(completion_ratio * 100))
    stability_score = clamp(round((rhythm_score * 0.55) + (endurance_score * 0.45)))

    scorecards = [
        build_scorecard(
            'accuracy',
            'Точность',
            accuracy_score,
            'Доля корректно набранных символов по всей тренировке.',
            [
                f"Корректно набрано {safe_round(result.accuracy)}% символов.",
                (
                    f"Наибольшее влияние на точность оказали {join_word_examples(difficult_words, 2)}."
                    if difficult_words else None
                ),
                (
                    f"Наиболее частый паттерн ошибки — {quote_word(error_patterns[0]['label'])}."
                    if error_patterns else None
                ),
            ],
        ),
        build_scorecard(
            'clean_run',
            'Чистые серии',
            clean_run_score,
            'Доля безошибочных слов и длина стабильных серий.',
            [
                f"Без ошибок пройдено {percent(error_free_ratio)}% слов.",
                f"Максимальная безошибочная серия — {streaks['longest_clean_streak']} слов.",
                (
                    f"Наибольшее число сбоев связано со словами {join_word_examples(difficult_words, 2)}."
                    if difficult_words else None
                ),
            ],
        ),
        build_scorecard(
            'speed',
            'Скорость',
            speed_score,
            'Фактический темп относительно целевого уровня для выбранного режима.',
            [
                f"Итоговый темп — {result.speed} WPM, медиана по словам — {safe_round(median_word_wpm)} WPM.",
                (
                    f"Наиболее высокий устойчивый темп зафиксирован на {join_word_examples(strongest_words, 2)}."
                    if strongest_words else None
                ),
                (
                    f"Минимальный темп зафиксирован на слове {quote_word(difficult_words[0]['correct'])} ({difficult_words[0]['wpm']} WPM)."
                    if difficult_words else None
                ),
            ],
        ),
        build_scorecard(
            'speed_control',
            'Контроль на темпе',
            speed_control_score,
            'Сохранение точности на повышенном темпе.',
            [
                f"На быстрых словах точность составила {safe_round(fast_words_accuracy)}%.",
                f"Доля ускорений с ошибками — {percent(rushed_ratio) if fast_words else 0}%.",
                (
                    f"Наибольшее отклонение при ускорении зафиксировано на {join_word_examples(rushed_words, 2)}."
                    if rushed_words else 'Выраженных отклонений при ускорении не зафиксировано.'
                ),
            ],
        ),
        build_scorecard(
            'rhythm',
            'Ровность ритма',
            rhythm_score,
            'Равномерность темпа между соседними словами.',
            [
                f"Среднее изменение темпа между соседними словами — {safe_round(average_jump)} WPM.",
                f"Коэффициент вариативности темпа — {safe_round(stability_cv, 2)}.",
                (
                    f"Наиболее нестабильный участок связан со словом {quote_word(difficult_words[0]['correct'])}."
                    if difficult_words else None
                ),
            ],
        ),
        build_scorecard(
            'endurance',
            'Выносливость',
            endurance_score,
            'Сохранение темпа и точности от старта к финишу.',
            [
                f"Снижение темпа к финишу — {safe_round(pace_drop_percent)}%.",
                f"Старт: {start_wpm} WPM и {safe_round(start_accuracy)}% точности. Финиш: {finish_wpm} WPM и {safe_round(finish_accuracy)}%.",
                (
                    f"Наиболее сложное слово финального сегмента — {quote_word(segments[-1]['hardest_word']['correct'])}."
                    if segments else None
                ),
            ],
        ),
        build_scorecard(
            'recovery',
            'Восстановление после ошибки',
            recovery_score,
            'Скорость возврата к точному набору после ошибки.',
            [
                (
                    f"После ошибочного слова восстановление зафиксировано в {percent(recovery_ratio)}% случаев."
                    if recovery_stats['opportunities_count']
                    else 'Недостаточно эпизодов для устойчивой оценки показателя.'
                ),
                (
                    f"Среднее снижение скорости после ошибки — {recovery_stats['average_speed_drop']} WPM."
                    if recovery_stats['opportunities_count']
                    else None
                ),
                (
                    f"Показательный эпизод: после {quote_word(recovery_stats['weak_examples'][0]['after'])} следовало слово {quote_word(recovery_stats['weak_examples'][0]['next'])} с пониженным качеством."
                    if recovery_stats['weak_examples'] else None
                ),
            ],
        ),
        build_scorecard(
            'hard_words',
            'Длинные и сложные слова',
            hard_words_score,
            'Качество набора на длинных и сложных словах.',
            [
                f"На длинных и сложных словах точность составила {safe_round(complex_accuracy)}%.",
                f"Без ошибок пройдено {safe_round(complex_error_free_ratio)}% таких слов.",
                (
                    f"Наибольшее влияние оказали {join_word_examples(difficult_words, 3)}."
                    if difficult_words else None
                ),
            ],
        ),
        build_scorecard(
            'completion',
            'Завершённость',
            completion_score,
            'Доля фактически пройденного объёма тренировки.',
            [
                f"Пройдено {safe_round(completion_score)}% от целевого объёма.",
                (
                    f"Это {typed_words_count} из {max(int(result.requested_size or 0), source_words_count, typed_words_count)} слов."
                    if result.mode == 'time'
                    else f"Это {typed_words_count} слов и {len(typed_input)} символов набора."
                ),
                (
                    'Для режима на время критичен быстрый старт.'
                    if result.mode == 'time' else None
                ),
            ],
        ),
    ]

    overall_score = clamp(round(
        (accuracy_score * 0.18)
        + (clean_run_score * 0.12)
        + (speed_score * 0.12)
        + (speed_control_score * 0.10)
        + (rhythm_score * 0.12)
        + (endurance_score * 0.10)
        + (recovery_score * 0.08)
        + (hard_words_score * 0.10)
        + (completion_score * 0.08)
    ))
    band, band_label = describe_band(overall_score)
    focus_area = build_focus_area(scorecards)

    context = {
        'segments': segments,
        'difficult_words': difficult_words,
        'strongest_words': strongest_words,
        'hesitation_words': hesitation_words,
        'rushed_words': rushed_words,
        'error_patterns': error_patterns,
        'pace_drop_percent': pace_drop_percent,
        'recovery_stats': recovery_stats,
        'accuracy_score': accuracy_score,
        'clean_run_score': clean_run_score,
        'rhythm_score': rhythm_score,
        'endurance_score': endurance_score,
        'recovery_score': recovery_score,
        'hard_words_score': hard_words_score,
        'speed_control_score': speed_control_score,
        'speed_score': speed_score,
        'completion_score': completion_score,
    }
    strengths, pain_points, recommendations = build_insights(result, context)

    return {
        'analysis_version': ANALYSIS_VERSION,
        'headline': build_headline(overall_score, focus_area),
        'focus_area': focus_area,
        'overall_score': overall_score,
        'speed_score': speed_score,
        'accuracy_score': accuracy_score,
        'stability_score': stability_score,
        'completion_score': completion_score,
        'metrics': {
            'band': band,
            'band_label': band_label,
            'coach_note': build_coach_note(context),
            'typed_words_count': typed_words_count,
            'source_words_count': source_words_count,
            'typed_chars_count': len(typed_input),
            'total_char_errors': total_char_errors,
            'total_word_errors': total_word_errors,
            'completion_ratio_percent': safe_round(completion_score, 1),
            'error_free_ratio_percent': percent(error_free_ratio),
            'word_error_ratio_percent': percent(word_error_ratio),
            'average_word_wpm': safe_round(avg_word_wpm),
            'median_word_wpm': safe_round(median_word_wpm),
            'average_word_accuracy': safe_round(average_word_accuracy),
            'average_word_duration': safe_round(avg_word_duration, 2),
            'median_word_duration': safe_round(median_word_duration, 2),
            'stability_cv': safe_round(stability_cv, 3),
            'average_jump_wpm': safe_round(average_jump),
            'pace_drop_percent': safe_round(pace_drop_percent),
            'scorecards': scorecards,
            'segments': segments,
            'difficult_words': difficult_words,
            'strongest_words': strongest_words,
            'hesitation_words': hesitation_words,
            'rushed_words': rushed_words,
            'error_patterns': error_patterns,
            'error_bursts': error_bursts,
            'word_length_breakdown': length_breakdown,
            'error_position_distribution': position_distribution,
            'longest_clean_streak': streaks['longest_clean_streak'],
            'longest_error_streak': streaks['longest_error_streak'],
            'recovery_ratio_percent': percent(recovery_ratio),
            'recovery_opportunities_count': recovery_stats['opportunities_count'],
            'recovery_examples': recovery_stats,
        },
        'strengths': strengths,
        'pain_points': pain_points,
        'recommendations': recommendations,
    }


def ensure_result_analysis(result, *, refresh=False):
    try:
        analysis = result.analysis
    except TrainingAnalysis.DoesNotExist:
        analysis = None

    if (
        analysis is not None
        and not refresh
        and analysis.analysis_version == ANALYSIS_VERSION
    ):
        return analysis

    payload = build_result_analysis_payload(result)
    analysis, _ = TrainingAnalysis.objects.update_or_create(
        result=result,
        defaults=payload,
    )
    result.analysis = analysis
    return analysis


def ensure_result_analyses(results):
    analyses = []
    for result in results:
        analyses.append(ensure_result_analysis(result))
    return analyses
