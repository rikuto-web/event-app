from pydantic import BaseModel


class ErrorDetailSchema(BaseModel):
    field: str
    message: str


class ErrorBodySchema(BaseModel):
    code: str
    message: str
    details: list[ErrorDetailSchema] = []


class ErrorResponseSchema(BaseModel):
    error: ErrorBodySchema
