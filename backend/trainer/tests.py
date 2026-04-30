from django.test import TestCase

from trainer.models import Result
from trainer.services.training_analysis import ensure_result_analysis
from trainer.services.training_security import build_verified_result_payload


class TrainingAnalysisServiceTests(TestCase):
    def test_analysis_is_created_with_insights(self):
        result = Result.objects.create(
            speed=62,
            accuracy=93.4,
            total_time=28.4,
            training_text='alpha bravo charlie delta echo foxtrot',
            mode='standard',
            text_type='quote',
            requested_size=6,
            words=[
                {
                    'correct': 'alpha',
                    'typed': 'alpha',
                    'duration': 1.2,
                    'wpm': 50,
                    'cpm': 250,
                    'errors': 0,
                },
                {
                    'correct': 'bravo',
                    'typed': 'braco',
                    'duration': 1.4,
                    'wpm': 43,
                    'cpm': 215,
                    'errors': 1,
                },
                {
                    'correct': 'charlie',
                    'typed': 'charlie',
                    'duration': 1.8,
                    'wpm': 47,
                    'cpm': 236,
                    'errors': 0,
                },
                {
                    'correct': 'delta',
                    'typed': 'delta',
                    'duration': 1.1,
                    'wpm': 55,
                    'cpm': 273,
                    'errors': 0,
                },
                {
                    'correct': 'echo',
                    'typed': 'echo',
                    'duration': 1.0,
                    'wpm': 48,
                    'cpm': 240,
                    'errors': 0,
                },
                {
                    'correct': 'foxtrot',
                    'typed': 'foxtrt',
                    'duration': 2.6,
                    'wpm': 28,
                    'cpm': 140,
                    'errors': 2,
                },
            ],
        )

        analysis = ensure_result_analysis(result)

        self.assertEqual(analysis.analysis_version, 'v6')
        self.assertTrue(analysis.headline)
        self.assertGreater(analysis.overall_score, 0)
        self.assertGreaterEqual(len(analysis.recommendations), 1)
        self.assertGreaterEqual(len(analysis.metrics['difficult_words']), 1)
        self.assertGreaterEqual(len(analysis.metrics['error_patterns']), 1)
        self.assertGreaterEqual(len(analysis.metrics['scorecards']), 8)
        self.assertEqual(len(analysis.metrics['summary_cards']), 3)
        self.assertTrue(analysis.metrics['coach_note'])
        self.assertIn('strongest_words', analysis.metrics)
        self.assertIn('hesitation_words', analysis.metrics)
        self.assertIn('rushed_words', analysis.metrics)

    def test_time_mode_completion_uses_requested_size(self):
        result = Result.objects.create(
            speed=55,
            accuracy=97.0,
            total_time=15.0,
            training_text='one two three four five six seven eight nine ten eleven twelve',
            mode='time',
            text_type='words',
            requested_size=10,
            words=[
                {
                    'correct': 'one',
                    'typed': 'one',
                    'duration': 0.7,
                    'wpm': 51,
                    'cpm': 255,
                    'errors': 0,
                },
                {
                    'correct': 'two',
                    'typed': 'two',
                    'duration': 0.8,
                    'wpm': 45,
                    'cpm': 225,
                    'errors': 0,
                },
                {
                    'correct': 'three',
                    'typed': 'three',
                    'duration': 1.0,
                    'wpm': 60,
                    'cpm': 300,
                    'errors': 0,
                },
                {
                    'correct': 'four',
                    'typed': 'four',
                    'duration': 0.9,
                    'wpm': 53,
                    'cpm': 266,
                    'errors': 0,
                },
                {
                    'correct': 'five',
                    'typed': 'five',
                    'duration': 1.1,
                    'wpm': 44,
                    'cpm': 220,
                    'errors': 0,
                },
            ],
        )

        analysis = ensure_result_analysis(result)

        self.assertEqual(analysis.completion_score, 50)
        self.assertEqual(analysis.metrics['completion_ratio_percent'], 50)

    def test_clean_streak_resets_after_corrected_mistake(self):
        result = Result.objects.create(
            speed=58,
            accuracy=100.0,
            total_time=12.0,
            training_text='alpha bravo charlie delta',
            mode='standard',
            text_type='quote',
            requested_size=4,
            words=[
                {
                    'correct': 'alpha',
                    'typed': 'alpha',
                    'duration': 1.0,
                    'wpm': 60,
                    'cpm': 300,
                    'errors': 0,
                    'had_mistake': False,
                },
                {
                    'correct': 'bravo',
                    'typed': 'bravo',
                    'duration': 1.1,
                    'wpm': 55,
                    'cpm': 275,
                    'errors': 0,
                    'had_mistake': True,
                },
                {
                    'correct': 'charlie',
                    'typed': 'charlie',
                    'duration': 1.2,
                    'wpm': 58,
                    'cpm': 290,
                    'errors': 0,
                    'had_mistake': False,
                },
                {
                    'correct': 'delta',
                    'typed': 'delta',
                    'duration': 1.0,
                    'wpm': 60,
                    'cpm': 300,
                    'errors': 0,
                    'had_mistake': False,
                },
            ],
        )

        analysis = ensure_result_analysis(result)

        self.assertEqual(analysis.metrics['longest_clean_streak'], 2)

    def test_recovery_counts_corrected_word(self):
        result = Result.objects.create(
            speed=54,
            accuracy=97.0,
            total_time=10.5,
            training_text='alpha bravo charlie',
            mode='standard',
            text_type='quote',
            requested_size=3,
            words=[
                {
                    'correct': 'alpha',
                    'typed': 'alpha',
                    'duration': 1.0,
                    'wpm': 60,
                    'cpm': 300,
                    'errors': 0,
                    'had_mistake': False,
                },
                {
                    'correct': 'bravo',
                    'typed': 'bravo',
                    'duration': 1.2,
                    'wpm': 50,
                    'cpm': 250,
                    'errors': 0,
                    'had_mistake': True,
                },
                {
                    'correct': 'charlie',
                    'typed': 'charlie',
                    'duration': 1.3,
                    'wpm': 48,
                    'cpm': 240,
                    'errors': 0,
                    'had_mistake': False,
                },
            ],
        )

        analysis = ensure_result_analysis(result)

        self.assertEqual(analysis.metrics['recovery_opportunities_count'], 1)
        self.assertEqual(analysis.metrics['self_correction_ratio_percent'], 100.0)
        self.assertEqual(analysis.metrics['stable_follow_up_ratio_percent'], 100.0)


class TrainingSecurityServiceTests(TestCase):
    def test_word_graph_wpm_values_are_local_not_cumulative(self):
        payload = build_verified_result_payload(
            'alpha bravo charlie',
            [
                {
                    'correct': 'alpha',
                    'typed': 'alpha',
                    'duration': 1.0,
                },
                {
                    'correct': 'bravo',
                    'typed': 'braco',
                    'duration': 1.0,
                },
                {
                    'correct': 'charlie',
                    'typed': 'charlie',
                    'duration': 1.0,
                },
            ],
            3.0,
        )

        self.assertEqual([word['wpm'] for word in payload['words']], [72, 0, 84])
        self.assertEqual([word['rwpm'] for word in payload['words']], [72, 72, 84])
        self.assertEqual(
            [word['progress_wpm'] for word in payload['words']],
            [72, 36, 52],
        )
        self.assertEqual(
            [word['progress_rwpm'] for word in payload['words']],
            [72, 72, 76],
        )
