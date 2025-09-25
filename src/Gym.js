import React, { useState } from "react";

const exercises = [
  {
    id: "linear-comb",
    name: "Linearkombination",
    description: "Bilde die Linearkombination mehrerer Vektoren mit gegebenen Skalaren.",
    defaultParams: { dim: 2, count: 3 },
    generate: ({ dim, count }) => {
      const vectors = Array.from({ length: count }, () =>
        Array.from({ length: dim }, () => Math.floor(Math.random() * 5))
      );
      const scalars = Array.from({ length: count }, () => Math.floor(Math.random() * 5));
      const solution = Array.from({ length: dim }, (_, i) =>
        vectors.reduce((sum, vec, j) => sum + scalars[j] * vec[i], 0)
      );
      return { vectors, scalars, solution };
    },
    check: (input, solution) => {
      return input.length === solution.length && input.every((val, i) => Number(val) === solution[i]);
    },
  },
  {
    id: "matrix-mult",
    name: "Matrixmultiplikation",
    description: "Berechne das Produkt zweier Matrizen.",
    defaultParams: { rows: 2, cols: 2 },
    generate: ({ rows, cols }) => {
      const A = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => Math.floor(Math.random() * 5))
      );
      const B = Array.from({ length: cols }, () =>
        Array.from({ length: rows }, () => Math.floor(Math.random() * 5))
      );
      const solution = Array.from({ length: rows }, (_, i) =>
        Array.from({ length: rows }, (_, j) =>
          Array.from({ length: cols }, (_, k) => A[i][k] * B[k][j]).reduce((a, b) => a + b, 0)
        )
      );
      return { A, B, solution };
    },
    check: (input, solution) => {
      return (
        input.length === solution.length &&
        input.every(
          (row, i) =>
            row.length === solution[i].length &&
            row.every((val, j) => Number(val) === solution[i][j])
        )
      );
    },
  },
{
  id: "scalar-mult",
  name: "Skalarprodukt",
  description: "Berechne das Skalarprodukt zweier Vektoren.",
  defaultParams: { dim: 2 },
  generate: ({ dim }) => {
    const v1 = Array.from({ length: dim }, () => Math.floor(Math.random() * 5));
    const v2 = Array.from({ length: dim }, () => Math.floor(Math.random() * 5));
    const solution = v1.reduce((sum, val, i) => sum + val * v2[i], 0);
    return { v1, v2, solution };
  },
  check: (input, solution) => {
    return Number(input) === solution;
  },
},
  {
    id: "vector-add",
    name: "Vektoraddition",
    description: "Addiere zwei Vektoren.",
    defaultParams: { dim: 2 },
    generate: ({ dim }) => {
      const v1 = Array.from({ length: dim }, () => Math.floor(Math.random() * 5));
      const v2 = Array.from({ length: dim }, () => Math.floor(Math.random() * 5));
      const solution = v1.map((v, i) => v + v2[i]);
      return { v1, v2, solution };
    },
    check: (input, solution) => {
      return input.length === solution.length && input.every((val, i) => Number(val) === solution[i]);
    },
  },
];

function MatrixBracket({ rows, flip }) {
  const height = Math.max(rows * 32, 40);
  const path = !flip
    ? `M12,5 Q2,${height / 2} 12,${height - 5}`
    : `M4,5 Q14,${height / 2} 4,${height - 5}`;
  return (
    <svg width="16" height={height} viewBox={`0 0 16 ${height}`} className="inline-block align-middle">
      <path d={path} stroke="black" strokeWidth="2" fill="none" />
    </svg>
  );
}
function ScalarInput({ value, onChange, feedbackColor }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      className={`w-16 px-2 py-1 rounded border text-center outline-none font-mono ${feedbackColor} bg-white border-black focus:border-red-600`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}


function MatrixDisplay({ matrix }) {
  return (
    <div className="flex items-center justify-center mb-2 font-mono">
      <MatrixBracket rows={matrix.length} />
      <table className="inline-block align-middle">
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              {row.map((val, j) => (
                <td key={j} className="px-3 py-1 text-center text-lg">
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <MatrixBracket rows={matrix.length} flip />
    </div>
  );
}

function VectorBracket({ dim, flip }) {
  const height = Math.max(dim * 32, 40);
  const path = !flip
    ? `M12,5 Q2,${height / 2} 12,${height - 5}`
    : `M4,5 Q14,${height / 2} 4,${height - 5}`;
  return (
    <svg width="16" height={height} viewBox={`0 0 16 ${height}`} className="inline-block align-middle">
      <path d={path} stroke="black" strokeWidth="2" fill="none" />
    </svg>
  );
}

function VectorDisplay({ vector }) {
  return (
    <div className="flex items-center justify-center mb-2 font-mono">
      <VectorBracket dim={vector.length} />
      <div className="flex flex-col">
        {vector.map((val, i) => (
          <span key={i} className="px-3 py-1 text-center text-lg">
            {val}
          </span>
        ))}
      </div>
      <VectorBracket dim={vector.length} flip />
    </div>
  );
}

function MatrixInput({ rows, cols, value, onChange, solution, showFeedback, feedbackColors }) {
  return (
    <div className="flex items-center justify-center mb-2">
      <MatrixBracket rows={rows} />
      <table className="inline-block align-middle">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: cols }).map((_, j) => {
                const feedback = showFeedback && feedbackColors ? feedbackColors[i][j] : "";
                return (
                  <td key={j}>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      tabIndex={i * cols + j + 1}
                      className={`w-12 px-2 py-1 rounded border text-center outline-none font-mono ${feedback} bg-white border-black focus:border-red-600`}
                      style={{ MozAppearance: "textfield" }}
                      value={value[i][j]}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        const newArr = value.map((row) => [...row]);
                        newArr[i][j] = newVal;
                        onChange(newArr);
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <MatrixBracket rows={rows} flip />
    </div>
  );
}

function VectorInput({ dim, value, onChange, solution, showFeedback, feedbackColors }) {
  return (
    <div className="flex items-center justify-center mb-2">
      <VectorBracket dim={dim} />
      <div className="flex flex-col">
        {Array.from({ length: dim }).map((_, i) => {
          const feedback = showFeedback && feedbackColors ? feedbackColors[i] : "";
          return (
            <input
              key={i}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              tabIndex={i + 1}
              className={`w-12 px-2 py-1 rounded border text-center outline-none font-mono ${feedback} bg-white border-black focus:border-red-600 mb-1`}
              style={{ MozAppearance: "textfield" }}
              value={value[i]}
              onChange={(e) => {
                const newArr = [...value];
                newArr[i] = e.target.value;
                onChange(newArr);
              }}
            />
          );
        })}
      </div>
      <VectorBracket dim={dim} flip />
    </div>
  );
}

function Gym() {
  const [selected, setSelected] = useState(exercises[0].id);
  const [params, setParams] = useState(exercises[0].defaultParams);
  const [problem, setProblem] = useState(exercises[0].generate(exercises[0].defaultParams));
  const [userInput, setUserInput] = useState(
    exercises[0].id === "matrix-mult"
      ? Array.from({ length: params.rows }, () => Array.from({ length: params.rows }, () => ""))
      : Array.from({ length: params.dim }, () => "")
  );
  const [result, setResult] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const exercise = exercises.find((ex) => ex.id === selected);

  const handleTab = (id) => {
    setSelected(id);
    setParams(exercises.find((ex) => ex.id === id).defaultParams);
    const ex = exercises.find((ex) => ex.id === id);
    setProblem(ex.generate(ex.defaultParams));
  setUserInput(
    id === "matrix-mult"
      ? Array.from({ length: ex.defaultParams.rows }, () =>
          Array.from({ length: ex.defaultParams.rows }, () => "")
        )
      : id === "scalar-mult"
        ? ""            // <-- statt Array
        : Array.from({ length: ex.defaultParams.dim }, () => "")
  );

    setResult(null);
    setShowErrors(false);
    setIsCorrect(false);
  };

  const handleParamChange = (e) => {
    const { name, value } = e.target;
    const newParams = { ...params, [name]: Number(value) };
    setParams(newParams);
    setProblem(exercise.generate(newParams));
setUserInput(
  exercise.id === "matrix-mult"
    ? Array.from({ length: newParams.rows }, () =>
        Array.from({ length: newParams.rows }, () => "")
      )
    : exercise.id === "scalar-mult"
      ? ""            // <-- statt Array
      : Array.from({ length: newParams.dim }, () => "")
);

    setResult(null);
    setShowErrors(false);
    setIsCorrect(false);
  };

  const handleInputChange = (val) => {
    setUserInput(val);
    setShowErrors(false);
    setResult(null);
    setIsCorrect(false);
  };

const handleCheck = () => {
  let parsed;
  let correct = true;
  let feedbackColors;

  if (exercise.id === "matrix-mult") {
    parsed = userInput.map((row) => row.map(Number));
    feedbackColors = parsed.map((row, i) =>
      row.map((val, j) =>
        val === problem.solution[i][j] ? "" : "bg-red-100 border-red-600 text-red-600"
      )
    );
    correct = parsed.every((row, i) => row.every((val, j) => val === problem.solution[i][j]));
  } else if (exercise.id === "scalar-mult") {
    parsed = Number(userInput); // nur eine Zahl
    const correctVal = problem.solution;
    feedbackColors =
      parsed === correctVal ? "" : "bg-red-100 border-red-600 text-red-600";
    correct = parsed === correctVal;
  } else {
    // vector-add, linear-comb ...
    parsed = userInput.map(Number);
    feedbackColors = parsed.map((val, i) =>
      val === problem.solution[i] ? "" : "bg-red-100 border-red-600 text-red-600"
    );
    correct = parsed.every((val, i) => val === problem.solution[i]);
  }

  setResult({ feedbackColors });
  setIsCorrect(correct);
  setShowErrors(false);
};


  const handleShowErrors = () => {
    setShowErrors(true);
    let feedbackColors;
    if (exercise.id === "matrix-mult") {
      feedbackColors = userInput.map((row, i) =>
        row.map((val, j) =>
          Number(val) !== problem.solution[i][j] ? "bg-red-100 border-red-600 text-red-600" : ""
        )
      );
    } else {
      feedbackColors = userInput.map((val, i) =>
        Number(val) !== problem.solution[i] ? "bg-red-100 border-red-600 text-red-600" : ""
      );
    }
    setResult({ feedbackColors });
  };

  const handleNewProblem = () => {
    setProblem(exercise.generate(params));
setUserInput(
  exercise.id === "matrix-mult"
    ? Array.from({ length: params.rows }, () =>
        Array.from({ length: params.rows }, () => "")
      )
    : exercise.id === "scalar-mult"
      ? ""            // <-- statt Array
      : Array.from({ length: params.dim }, () => "")
);

    setResult(null);
    setShowErrors(false);
    setIsCorrect(false);
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col items-center py-8">
      <h1 className="text-3xl font-bold mb-6">Gym 🏋️</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {exercises.map((ex) => (
          <button
            key={ex.id}
            onClick={() => handleTab(ex.id)}
            className={`px-6 py-2 rounded font-semibold transition-colors duration-200 border ${
              selected === ex.id
                ? "bg-red-100 text-black border-black"
                : "bg-white text-black border-black hover:bg-red-100"
            }`}
            style={{ minWidth: 140 }}
          >
            {ex.name}
          </button>
        ))}
      </div>

      {/* Parameter controls */}
      <div className="flex gap-4 mb-6">
        {selected === "matrix-mult" && (
          <>
            <label>
              Zeilen:
              <input
                type="number"
                name="rows"
                min={2}
                max={5}
                value={params.rows}
                onChange={handleParamChange}
                className="ml-2 w-16 px-2 py-1 rounded border border-black bg-white text-black"
              />
            </label>
            <label>
              Spalten:
              <input
                type="number"
                name="cols"
                min={2}
                max={5}
                value={params.cols}
                onChange={handleParamChange}
                className="ml-2 w-16 px-2 py-1 rounded border border-black bg-white text-black"
              />
            </label>
          </>
        )}
        {(selected === "scalar-mult" || selected === "vector-add") && (
          <label>
            Dimension:
            <input
              type="number"
              name="dim"
              min={2}
              max={5}
              value={params.dim}
              onChange={handleParamChange}
              className="ml-2 w-16 px-2 py-1 rounded border border-black bg-white text-black"
            />
          </label>
        )}
        {selected === "linear-comb" && (
          <>
            <label>
              Dimension:
              <input
                type="number"
                name="dim"
                min={2}
                max={5}
                value={params.dim}
                onChange={handleParamChange}
                className="ml-2 w-16 px-2 py-1 rounded border border-black bg-white text-black"
              />
            </label>
            <label>
              Anzahl Vektoren:
              <input
                type="number"
                name="count"
                min={2}
                max={5}
                value={params.count}
                onChange={handleParamChange}
                className="ml-2 w-16 px-2 py-1 rounded border border-black bg-white text-black"
              />
            </label>
          </>
        )}
      </div>

      {/* Aufgabenanzeige */}
      <div className="rounded-xl shadow-lg p-6 w-full max-w-3xl border border-black mb-6">
        <div className="mb-4">
          {selected === "matrix-mult" && (
            <div className="flex items-center justify-center mb-4">
              <MatrixDisplay matrix={problem.A} />
              <span className="mx-4 text-2xl font-bold">×</span>
              <MatrixDisplay matrix={problem.B} />
              <span className="mx-4 text-2xl font-bold">=</span>
              <MatrixInput
                rows={params.rows}
                cols={params.rows}
                value={userInput}
                onChange={handleInputChange}
                solution={problem.solution}
                showFeedback={showErrors}
                feedbackColors={result?.feedbackColors}
              />
            </div>
          )}

          {selected === "scalar-mult" && (
            <div className="flex items-center justify-center mb-4">
              <VectorDisplay vector={problem.v1} />
              <span className="mx-4 text-2xl font-bold">·</span>
              <VectorDisplay vector={problem.v2} />
              <span className="mx-4 text-2xl font-bold">=</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className={`w-16 px-2 py-1 rounded border text-center outline-none font-mono ${
                  result?.feedbackColors || ""
                } bg-white border-black focus:border-red-600`}
                value={userInput}
                onChange={(e) => handleInputChange(e.target.value)}
              />
            </div>
          )}

          {selected === "vector-add" && (
            <div className="flex items-center justify-center mb-4">
              <VectorDisplay vector={problem.v1} />
              <span className="mx-4 text-2xl font-bold">+</span>
              <VectorDisplay vector={problem.v2} />
              <span className="mx-4 text-2xl font-bold">=</span>
              <VectorInput
                dim={params.dim}
                value={userInput}
                onChange={handleInputChange}
                solution={problem.solution}
                showFeedback={showErrors}
                feedbackColors={result?.feedbackColors}
              />
            </div>
          )}

          {selected === "linear-comb" && (
            <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
              {problem.vectors.map((vec, j) => (
                <div key={j} className="flex items-center">
                  <div className="flex items-center mr-2">
                    <span className="text-lg font-mono relative -top-0.5">{problem.scalars[j]}</span>
                    <span className="text-lg font-mono relative -top-0.5 mx-1">×</span>
                  </div>
                  <VectorDisplay vector={vec} />
                  {j < problem.vectors.length - 1 && (
                    <span className="text-lg font-mono relative -top-0.5">+</span>
                  )}
                </div>
              ))}
              <span className="text-lg font-mono relative -top-0.5">=</span>
              <VectorInput
                dim={params.dim}
                value={userInput}
                onChange={handleInputChange}
                solution={problem.solution}
                showFeedback={showErrors}
                feedbackColors={result?.feedbackColors}
              />
            </div>
          )}
        </div>

        {/* Buttons + Feedback */}
        <div className="flex items-center gap-4 justify-between w-full">
          <div className="flex gap-4">
            <button
              onClick={handleCheck}
              className="mt-2 px-4 py-2 rounded font-semibold border border-black bg-white text-black hover:bg-red-100 transition-colors"
              style={{ minWidth: 200 }}
            >
              Lösung prüfen
            </button>
            {isCorrect && (
              <div className="text-lg font-semibold text-green-600 flex items-center">
                ✅ Richtig!
              </div>
            )}
            {!isCorrect && result && (
              <span className="text-lg font-semibold text-red-600 flex items-center">
                ❌ Fehler!
              </span>
            )}
          </div>
          {!isCorrect && result && selected!=="scalar-mult" &&(
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={handleShowErrors}
                className="px-4 py-2 rounded font-semibold border border-black bg-white text-black hover:bg-red-100 transition-colors"
              >
                Fehler anzeigen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Neue Aufgabe */}
      <button
        onClick={handleNewProblem}
        className="mt-2 px-4 py-2 rounded font-semibold border border-black bg-white text-black hover:bg-red-100 transition-colors"
        style={{ minWidth: 200 }}
      >
        Neue Aufgabe generieren
      </button>
    </div>
  );

}

export default Gym;
