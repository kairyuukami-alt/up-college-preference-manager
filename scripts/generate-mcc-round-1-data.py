#!/usr/bin/env python3
"""Convert Poppler TSV from MCC's official Round 1 PDF into typed site data."""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path


EXPECTED_ROWS = 29_946
EXPECTED_COURSES = {"MBBS", "BDS", "B.Sc. Nursing"}


def clean(parts: list[str]) -> str:
    return " ".join(parts).strip()


def parse_rows(source: Path) -> list[list[str]]:
    words_by_page: dict[int, list[tuple[float, float, str]]] = defaultdict(list)
    with source.open(encoding="utf-8", newline="") as stream:
        for item in csv.DictReader(stream, delimiter="\t"):
            if item["level"] != "5" or float(item["top"]) >= 575:
                continue
            words_by_page[int(item["page_num"])].append(
                (float(item["top"]), float(item["left"]), item["text"])
            )

    parsed: list[dict[str, object]] = []
    for page_number, page_words in sorted(words_by_page.items()):
        lines: list[tuple[float, list[tuple[float, str]]]] = []
        for top, left, value in sorted(page_words):
            if not lines or abs(lines[-1][0] - top) > 1.5:
                lines.append((top, [(left, value)]))
            else:
                lines[-1][1].append((left, value))

        current: dict[str, object] | None = None
        for _, words in lines:
            words.sort()
            serial = next((value for left, value in words if left < 35 and value.isdigit()), None)
            rank = next(
                (value for left, value in words if 35 <= left < 95 and value.isdigit()),
                None,
            )
            if serial and rank:
                if current:
                    parsed.append(current)
                current = {
                    "serial": serial,
                    "rank": rank,
                    "quota": [],
                    "institute": [],
                    "course": [],
                    "allotted_category": [],
                    "candidate_category": [],
                    "remark": [],
                    "page": page_number,
                }

            if not current:
                continue

            for left, value in words:
                if left < 95:
                    continue
                target = (
                    "quota"
                    if left < 175
                    else "institute"
                    if left < 560
                    else "course"
                    if left < 650
                    else "allotted_category"
                    if left < 700
                    else "candidate_category"
                    if left < 770
                    else "remark"
                )
                current[target].append(value)  # type: ignore[union-attr]

        if current:
            parsed.append(current)

    rows: list[list[str]] = []
    for item in parsed:
        candidate_parts = list(item["candidate_category"])  # type: ignore[arg-type]
        remark_parts = list(item["remark"])  # type: ignore[arg-type]
        if "Allotted(" in candidate_parts:
            marker = candidate_parts.index("Allotted(")
            remark_parts = candidate_parts[marker:] + remark_parts
        rows.append(
            [
                str(item["rank"]),
                clean(item["quota"]),  # type: ignore[arg-type]
                clean(item["institute"]),  # type: ignore[arg-type]
                clean(item["course"]),  # type: ignore[arg-type]
                clean(item["allotted_category"]),  # type: ignore[arg-type]
                clean(remark_parts),
            ]
        )

    serials = [int(item["serial"]) for item in parsed]
    if len(rows) != EXPECTED_ROWS:
        raise ValueError(f"Expected {EXPECTED_ROWS} records, found {len(rows)}")
    if serials != list(range(1, EXPECTED_ROWS + 1)):
        raise ValueError("MCC serial numbers are missing or out of order")
    if len({row[0] for row in rows}) != len(rows):
        raise ValueError("Duplicate NEET AIR values detected")
    if {row[3] for row in rows} - EXPECTED_COURSES:
        raise ValueError("Unexpected course values detected")
    if any(not value for row in rows for value in row):
        raise ValueError("One or more required official result values are blank")
    return rows


def write_typescript(rows: list[list[str]], destination: Path) -> None:
    header = (
        "// Generated only from MCC's official final Round 1 allotment PDF.\n"
        "// Search identifier: NEET All India Rank (AIR).\n"
        "export const MCC_ROUND_1_ROWS: ReadonlyArray<\n"
        "  readonly [string, string, string, string, string, string]\n"
        "> = [\n"
    )
    with destination.open("w", encoding="utf-8", newline="\n") as stream:
        stream.write(header)
        for row in rows:
            stream.write("  ")
            stream.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")))
            stream.write(",\n")
        stream.write("];\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_tsv", type=Path)
    parser.add_argument("destination_ts", type=Path)
    args = parser.parse_args()
    rows = parse_rows(args.source_tsv)
    write_typescript(rows, args.destination_ts)
    print(f"Generated {len(rows)} verified MCC result records")


if __name__ == "__main__":
    main()
