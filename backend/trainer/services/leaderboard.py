from django.db.models import Count, OuterRef, Subquery

from ..models import Language, Result
from ..serializers import LanguageSerializer, ResultSerializer


def build_leaderboard_data(user_model, limit=10):
    best_result_queryset = (
        Result.objects.filter(
            user=OuterRef('pk'),
            is_personal_text=False,
        )
        .order_by('-speed', '-accuracy', '-created_at')
    )

    top_users = (
        user_model.objects.filter(
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
        [:limit]
    )

    return [
        {
            "id": user.best_result_id,
            "user_id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "avatar": user.avatar.url if user.avatar else None,
            "speed": user.best_speed,
            "accuracy": user.best_accuracy,
            "date": user.best_date,
        }
        for user in top_users
    ]


def build_leaderboard_user_detail(user):
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

    return {
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
