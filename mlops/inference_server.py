#!/usr/bin/env python3
"""Minimal standard-library inference service for OrcaCloud model artifacts."""

from __future__ import annotations

import argparse
import json
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from pipeline import sigmoid


def load_model(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def build_handler(model: dict, events: Path):
    class Handler(BaseHTTPRequestHandler):
        def _json(self, status: HTTPStatus, payload: dict) -> None:
            body = json.dumps(payload).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self) -> None:
            if self.path in ("/healthz", "/readyz"):
                self._json(HTTPStatus.OK, {"status": "ok"})
            else:
                self._json(HTTPStatus.NOT_FOUND, {"error": "not found"})

        def do_POST(self) -> None:
            started = time.perf_counter()
            if self.path != "/predict":
                self._json(HTTPStatus.NOT_FOUND, {"error": "not found"})
                return
            try:
                size = int(self.headers.get("Content-Length", "0"))
                features = json.loads(self.rfile.read(size))["features"]
                normalized = [
                    (float(features[name]) - model["means"][index]) / model["scales"][index]
                    for index, name in enumerate(model["feature_names"])
                ]
                probability = sigmoid(model["bias"] + sum(weight * value for weight, value in zip(model["weights"], normalized)))
                prediction = int(probability >= model["threshold"])
                event = {"status": "ok", "features": features, "prediction": prediction,
                         "latency_ms": (time.perf_counter() - started) * 1000}
                events.parent.mkdir(parents=True, exist_ok=True)
                with events.open("a", encoding="utf-8") as handle:
                    handle.write(json.dumps(event) + "\n")
                self._json(HTTPStatus.OK, {"prediction": prediction, "probability": probability})
            except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
                self._json(HTTPStatus.BAD_REQUEST, {"error": str(error)})

        def log_message(self, _format: str, *_args: object) -> None:
            return

    return Handler


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--events", type=Path, required=True)
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    ThreadingHTTPServer(("0.0.0.0", args.port), build_handler(load_model(args.model), args.events)).serve_forever()


if __name__ == "__main__":
    main()
