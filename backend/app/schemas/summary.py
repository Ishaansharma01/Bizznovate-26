"""Schemas for AI-assisted practice reflection summaries."""
import datetime
from pydantic import BaseModel, ConfigDict


class JournalSummaryResponse(BaseModel):
    id: str
    log_id: str
    key_learning: str
    practice_reflection: str
    topics_for_review: str
    source_journal_hash: str
    is_stale: bool
    provider: str
    generated_at: datetime.datetime
    ai_label: str = "[AI-Generated Practice Brief · Decision-support only · Does not approve hours]"

    model_config = ConfigDict(from_attributes=True)
