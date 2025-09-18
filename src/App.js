import React from "react";
import Gym from "./Gym";
import Linearkombinationen from "./LinearKombinationen";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { ReactComponent as GithubIcon } from "./github.svg"; // eigenes SVG

const navLinks = [
  { name: "About", to: "/about" },
];

const gridLinks = [
  { name: "Linearkombination", to: "/linearkombination" },
  { name: "Matrizen", to: "/matrizen" },
  // restliche 7 Plätze bleiben leer
];

function Landing() {
  return (
    <div className="min-h-screen bg-white text-black font-sans">
      {/* Navbar (hell, gefüllt, Hover rot) */}
      <nav className="flex items-center justify-between px-8 py-4 bg-white border-b border-black">
        <div className="flex items-center gap-6">
          <span className="text-2xl font-bold tracking-wide">LinAlg 2026</span>
          <div className="flex items-center gap-4">
            {navLinks.map((l) => (
              <Link key={l.name} to={l.to} className="hover:text-red-600">
                {l.name}
              </Link>
            ))}
          </div>
        </div>
        <a
          href="https://github.com/your-repo"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-red-600"
          aria-label="GitHub"
        >
          <GithubIcon width={24} height={24} />
        </a>
      </nav>

      {/* Welcome-Text */}
      <div className="max-w-2xl mx-auto mt-10 text-center px-4">
        <h1 className="text-3xl font-bold mb-4">Welcome to Linear Algebra</h1>
        <p className="text-base mb-8">
          This collection of content has been created by student Teaching Assistants to accompany the course{" "}
          <span className="font-mono text-red-600">401-0131-00L Linear Algebra</span> in HS26 at ETH Zürich.
          <br />
          Feel free to contribute wherever you believe your input could benefit other students.
        </p>
      </div>

      {/* Oben: Gym (kompakt) */}
      <div className="max-w-md mx-auto mb-8 px-4">
        <Link
          to="/gym"
          className="block w-full bg-white border border-black rounded-lg p-5 text-xl md:text-2xl font-semibold text-center hover:bg-red-50"
        >
          Gym 🏋️
        </Link>
      </div>

      {/* 3x3 Grid: nur 2 Einträge belegt, rest dezente Platzhalter */}
      <div className="max-w-5xl mx-auto grid grid-cols-3 gap-4 px-4 pb-12">
        {gridLinks.map((link) => (
          <Link
            key={link.name}
            to={link.to}
            className="block bg-white border border-black rounded-lg p-4 text-lg md:text-xl font-semibold text-center hover:bg-red-50"
          >
            {link.name}
          </Link>
        ))}
        {Array.from({ length: 9 - gridLinks.length }).map((_, i) => (
          <div key={i} className="border border-dashed border-black/30 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function Page({ title }) {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center font-sans">
      <h1 className="text-3xl font-bold mb-4">{title}</h1>
      <Link to="/" className="text-lg hover:text-red-600">Back to Landing</Link>
    </div>
  );
}
// unten in derselben Datei einfügen (z.B. unter Page)
function DisclaimerBanner() {
  return (
    <div className="w-full border-t border-yellow-200 bg-yellow-50 text-yellow-800">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-start gap-2">
        <span aria-hidden>⚠️</span>
        <p className="text-sm">
          This webpage is not affiliated with ETH Zurich and does not guarantee the accuracy of its content.
        </p>
      </div>
    </div>
  );
}


function App() {
  return (
    <Router>
      <div className="h-screen flex flex-col">       {/* Gesamt: 100vh */}
        <div className="flex-1 overflow-hidden">     {/* Inhalt: Resthöhe, kein Scroll der Seite */}
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/gym" element={<Gym />} />
            <Route path="/linearkombination" element={<Linearkombinationen/>} />
            <Route path="/matrizen" element={<Page title="Matrizen" />} />
            <Route path="/gleichungssysteme" element={<Page title="Lineare Gleichungssysteme" />} />
            <Route path="/about" element={<Page title="About" />} />
          </Routes>
        </div>
        <DisclaimerBanner />                         {/* Banner: immer unten, ohne zu scrollen */}
      </div>
    </Router>
  );
}


export default App;
