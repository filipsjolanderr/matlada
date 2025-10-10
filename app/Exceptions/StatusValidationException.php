<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class StatusValidationException extends Exception
{
    protected int $statusCode;

    protected array $errors;

    public function __construct(string $message, int $statusCode = 400, array $errors = [], int $code = 0, ?Exception $previous = null)
    {
        parent::__construct($message, $code, $previous);
        $this->statusCode = $statusCode;
        $this->errors = $errors;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getErrors(): array
    {
        return $this->errors;
    }

    public function render(Request $request): JsonResponse|Response
    {
        if ($request->expectsJson()) {
            return response()->json([
                'message' => $this->getMessage(),
                'errors' => $this->errors,
            ], $this->statusCode);
        }

        return response($this->getMessage(), $this->statusCode);
    }
}
