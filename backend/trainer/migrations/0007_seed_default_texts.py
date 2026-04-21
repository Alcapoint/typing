from django.db import migrations


RU_TEXT = (
    "Слепая печать начинается не со скорости, а с устойчивого ритма. "
    "Когда пальцы возвращаются на исходную позицию, движение становится "
    "предсказуемым, а внимание освобождается для текста. Практика помогает "
    "заметить, как короткие серии точных нажатий постепенно превращаются в "
    "ровный поток, где каждая ошибка служит подсказкой, а не поводом для "
    "раздражения. Важно не пытаться выиграть у таймера в первые минуты, "
    "а сохранять спокойный темп и следить за тем, чтобы кисти оставались "
    "расслабленными. Чем стабильнее вы держите ритм, тем легче мозг "
    "запоминает комбинации букв, пробелов и знаков препинания. Со временем "
    "набираемый текст перестает ощущаться как набор отдельных действий. "
    "Появляется чувство связности: взгляд читает следующее слово, руки уже "
    "двигаются к нужным клавишам, а дыхание остается ровным. Такой способ "
    "тренировки особенно полезен для учебы, работы с кодом, переписки и "
    "любых задач, где важны концентрация, точность и способность долго "
    "сохранять внимание без лишнего напряжения."
)

EN_TEXT = (
    "Touch typing improves through consistency rather than speed chasing. "
    "When your hands return to the home row after every word, the keyboard "
    "starts to feel structured and predictable. That structure helps your "
    "brain build stronger patterns, so each new sentence demands less effort "
    "than the previous one. A calm rhythm is more valuable than a fast but "
    "chaotic sprint, because stable repetition trains accuracy and reduces "
    "hesitation. During a focused session, it is useful to notice posture, "
    "breathing, and finger travel instead of looking only at the result line. "
    "Small corrections compound over time. A relaxed wrist, a measured pace, "
    "and deliberate key presses create a cleaner foundation for future speed. "
    "As practice continues, words begin to arrive in larger chunks, and the "
    "gap between reading and typing becomes shorter. That is when typing feels "
    "less mechanical and more fluent, which makes the skill genuinely helpful "
    "for study, writing, programming, and everyday computer work."
)


def seed_default_texts(apps, schema_editor):
    Language = apps.get_model('trainer', 'Language')
    Text = apps.get_model('trainer', 'Text')

    for language_code, content in (
        ('ru', RU_TEXT),
        ('en', EN_TEXT),
    ):
        language = Language.objects.filter(code=language_code).first()
        if not language:
            continue

        Text.objects.get_or_create(
            language=language,
            content=content,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('trainer', '0006_usertext_and_result_flags'),
    ]

    operations = [
        migrations.RunPython(seed_default_texts, migrations.RunPython.noop),
    ]
