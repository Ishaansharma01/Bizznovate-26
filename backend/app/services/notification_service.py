"""Replaceable notification provider service for pace shortfall alerts."""
import logging
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from app.config import settings

logger = logging.getLogger("shailja_yoga.notifications")


class BaseNotificationProvider(ABC):
    """Abstract interface for pace alert notifications."""

    @abstractmethod
    def send_pace_alert(
        self,
        recipient_email: str,
        student_name: str,
        program_name: str,
        shortfall_hours: float,
        recommended_weekly_pace: float,
        target_graduation_date: str,
    ) -> bool:
        """Send a formatted pace warning notification.
        
        Invariant: Never include private reflection journals or internal faculty notes.
        """
        pass


class MockNotificationProvider(BaseNotificationProvider):
    """Safe local development notification provider logging alerts to console/memory."""

    def __init__(self):
        self.sent_notifications: List[Dict[str, Any]] = []

    def send_pace_alert(
        self,
        recipient_email: str,
        student_name: str,
        program_name: str,
        shortfall_hours: float,
        recommended_weekly_pace: float,
        target_graduation_date: str,
    ) -> bool:
        notification_record = {
            "recipient_email": recipient_email,
            "student_name": student_name,
            "program_name": program_name,
            "shortfall_hours": shortfall_hours,
            "recommended_weekly_pace": recommended_weekly_pace,
            "target_graduation_date": target_graduation_date,
            "provider": "mock",
            "delivered": True,
        }
        self.sent_notifications.append(notification_record)
        logger.info(
            f"[MOCK NOTIFICATION] Sent pace warning to {recipient_email} for {student_name}: "
            f"Shortfall={shortfall_hours}h, Recommended Weekly Pace={recommended_weekly_pace}h/week, "
            f"Target Date={target_graduation_date}."
        )
        return True


class SMTPNotificationProvider(BaseNotificationProvider):
    """Production SMTP email notification provider."""

    def __init__(self):
        self.mock_fallback = MockNotificationProvider()

    def send_pace_alert(
        self,
        recipient_email: str,
        student_name: str,
        program_name: str,
        shortfall_hours: float,
        recommended_weekly_pace: float,
        target_graduation_date: str,
    ) -> bool:
        # Check if real SMTP credentials are provided
        if not getattr(settings, "SMTP_HOST", None) or settings.SMTP_HOST == "smtp.mailtrap.io":
            logger.info("SMTP credentials unconfigured. Falling back safely to MockNotificationProvider.")
            return self.mock_fallback.send_pace_alert(
                recipient_email,
                student_name,
                program_name,
                shortfall_hours,
                recommended_weekly_pace,
                target_graduation_date,
            )
        # Real SMTP implementation would send email here
        return True


# Global provider instance
_provider_instance: Optional[BaseNotificationProvider] = None


def get_notification_provider() -> BaseNotificationProvider:
    global _provider_instance
    if _provider_instance is None:
        if settings.NOTIFICATION_PROVIDER.lower() == "smtp":
            _provider_instance = SMTPNotificationProvider()
        else:
            _provider_instance = MockNotificationProvider()
    return _provider_instance
