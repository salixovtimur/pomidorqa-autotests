import { readFileSync } from "node:fs";

const REPORT = "playwright-report/results.json";

function readReport() {
  try {
    return JSON.parse(readFileSync(REPORT, "utf8"));
  } catch {
    console.error(`Нет отчёта ${REPORT}. Сначала прогон: npm test`);
    process.exit(1);
  }
}

function collectSpecs(suite, acc = []) {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const last = test.results?.[test.results.length - 1];
      acc.push({
        title: spec.title,
        file: spec.file,
        project: test.projectName || "—",
        status: test.status,
        outcome: last?.status ?? "unknown",
        duration: (test.results ?? []).reduce((sum, run) => sum + (run.duration ?? 0), 0),
        retries: Math.max(0, (test.results?.length ?? 1) - 1),
      });
    }
  }
  for (const child of suite.suites ?? []) {
    collectSpecs(child, acc);
  }
  return acc;
}

function seconds(ms) {
  return `${(ms / 1000).toFixed(1)} с`;
}

function table(rows) {
  const widths = rows[0].map((_, column) =>
    Math.max(...rows.map((row) => String(row[column]).length))
  );
  return rows
    .map((row) =>
      row.map((cell, column) => String(cell).padEnd(widths[column])).join("  ").trimEnd()
    )
    .join("\n");
}

const report = readReport();
const specs = report.suites.flatMap((suite) => collectSpecs(suite));

const expected = specs.filter((spec) => spec.status === "expected").length;
const unexpected = specs.filter((spec) => spec.status === "unexpected");
const flaky = specs.filter((spec) => spec.status === "flaky");
const knownDefects = specs.filter((spec) => spec.outcome === "failed" && spec.status === "expected");
const totalDuration = specs.reduce((sum, spec) => sum + spec.duration, 0);

console.log("\nМетрики прогона PomidorQA\n");

console.log(
  table([
    ["Итог", "Тестов"],
    ["прошли", expected],
    ["упали", unexpected.length],
    ["флакнули и прошли с повтора", flaky.length],
    ["ожидаемые падения (известные дефекты)", knownDefects.length],
    ["всего", specs.length],
  ])
);

const levels = ["unit", "api", "e2e"];
console.log("\nПо уровням пирамиды\n");
console.log(
  table([
    ["Уровень", "Тестов", "Время", "Среднее"],
    ...levels.map((level) => {
      const group = specs.filter((spec) => spec.project === level);
      const time = group.reduce((sum, spec) => sum + spec.duration, 0);
      return [
        level,
        group.length,
        seconds(time),
        group.length ? seconds(time / group.length) : "—",
      ];
    }),
  ])
);

console.log(`\nОбщее время тестов: ${seconds(totalDuration)}`);

const slowest = [...specs].sort((a, b) => b.duration - a.duration).slice(0, 5);
console.log("\nСамые долгие сценарии\n");
console.log(
  table([
    ["Время", "Уровень", "Сценарий"],
    ...slowest.map((spec) => [seconds(spec.duration), spec.project, spec.title]),
  ])
);

const e2eFiles = [...new Set(specs.filter((spec) => spec.project === "e2e").map((s) => s.file))];
console.log(`\nE2E-файлов: ${e2eFiles.length}`);

if (unexpected.length > 0) {
  console.log("\nУпавшие сценарии\n");
  console.log(unexpected.map((spec) => `  ${spec.file} — ${spec.title}`).join("\n"));
  process.exit(1);
}

console.log("");
