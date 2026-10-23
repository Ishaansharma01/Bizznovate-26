"""Audit trail service for immutable system event logging."""
import datetime
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
from app.models.models import AuditEvent


def record_audit_event(
    db: Session,
    entity_type: str,
    entity_id: str,
    action: str,
    actor_id: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> AuditEvent:
    """Record an append-only audit event in the database."""
    event = AuditEvent(
        entity_type=entity_type,
        entity_id=entity_id,
        actor_id=actor_id,
        action=action,
        payload=payload,
        ip_address=ip_address,
        timestamp=datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(event)
    return event
