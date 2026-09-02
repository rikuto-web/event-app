from dataclasses import dataclass, field


@dataclass
class ErrorDetail:
    field: str
    message: str


@dataclass
class AppError(Exception):
    code: str
    message: str
    status_code: int = 400
    details: list[ErrorDetail] = field(default_factory=list)
