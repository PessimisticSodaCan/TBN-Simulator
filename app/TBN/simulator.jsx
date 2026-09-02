import { useState } from "react";
import { TBN_Simulation } from "./TBN_Simulation.js";

const DEFAULT_CONFIG = {
  model: "threshold",
  w: "1/3",
  threshold: "0",
  "initial config": [
    {
      name: "P1",
      monomers: [
        {
          name: "A1",
          domains: {
            "Γ": 2,
            "σ": 1,
            "Λ_1": -1,
            "Λ_3": -1
          }
        }
      ]
    },
    {
      name: "P2",
      monomers: [
        {
          name: "A2",
          domains: {
            "Γ": -1,
            "σ": 1,
            "Λ_1": 2,
            "Λ_2": -1,
            "B_2": -1
          }
        }
      ]
    },
    {
      name: "P3",
      monomers: [
        {
          name: "A3",
          domains: {
            "Γ": -1,
            "σ": 2,
            "Λ_2": 1,
            "Λ_3": -2,
            "B_1": -1
          }
        }
      ]
    }
  ]
};

export function Simulator() {
  const [model, setModel] = useState("barrier");

  const [w, setW] = useState("1");
  const [threshold, setThreshold] = useState("0");
  const [barrier, setBarrier] = useState("0");

  const [polymersConfig, setPolymersConfig] = useState(DEFAULT_CONFIG["initial config"]);
  
  const [initialConfigOpen, setInitialConfigOpen] = useState(true);

  const [jsonConfigOpen, setJsonConfigOpen] = useState(false);

  const [domainInputs, setDomainInputs] = useState({});

  const [simulation, setSimulation] = useState(null);

  const [, setMoveVersion] = useState(0);

  const [configurationJson, setConfigurationJson] = useState(JSON.stringify(DEFAULT_CONFIG, null, 2));
  
  const [configurationJsonError, setConfigurationJsonError] = useState("");

  /*
   * ================================
   * JSON CONFIG LOADER
   * ================================
   */

  function loadConfigurationJson() {
    try {
      const configuration = JSON.parse(configurationJson);

      if (typeof configuration !== "object" || configuration === null || Array.isArray(configuration) ) {
        throw new Error(
          "Configuration must be an object containing model settings and an initial config."
        );
      }

      if (typeof configuration.model !== "string") {
        throw new Error("Model must be a string.");
      }

      const validModels = ["greedy", "threshold", "barrier"];

      if (!validModels.includes(configuration.model)) {
        throw new Error(
          `Model must be one of: ${validModels.join(", ")}.`
        );
      }

      if (typeof configuration.w !== "string" && typeof configuration.w !== "number" ) {
        throw new Error("w must be a number or fraction string.");
      }

      if (configuration.model === "threshold") {
        if (typeof configuration.threshold !== "string") {
          throw new Error(
            "Threshold must be a string when using the threshold model."
          );
        }
      }

      if (configuration.model === "barrier") {
        if (typeof configuration.barrier !== "string") {
          throw new Error(
            "Barrier must be a string when using the barrier model."
          );
        }
      }

      const initialConfig = configuration["initial config"];

      if (!Array.isArray(initialConfig)) {
        throw new Error(
          '"initial config" must be an array of polymers.'
        );
      }

      // Validate polymers
      for (const polymer of initialConfig) {
        if (
          typeof polymer !== "object" ||
          polymer === null ||
          typeof polymer.name !== "string" ||
          !Array.isArray(polymer.monomers)
        ) {
          throw new Error(
            "Each polymer must have a name and monomers array."
          );
        }

        // Validate monomers
        for (const monomer of polymer.monomers) {
          if (
            typeof monomer !== "object" ||
            monomer === null ||
            typeof monomer.name !== "string" ||
            typeof monomer.domains !== "object" ||
            monomer.domains === null ||
            Array.isArray(monomer.domains)
          ) {
            throw new Error(
              "Each monomer must have a name and domains object."
            );
          }

          // Validate domain quantities
          for (const quantity of Object.values(monomer.domains)) {
            if (
              typeof quantity !== "number" ||
              !Number.isFinite(quantity)
            ) {
              throw new Error(
                "Domain quantities must be numbers."
              );
            }
          }
        }
      }

      // Apply the configuration
      setModel(configuration.model);
      setW(String(configuration.w));

      if (configuration.model === "threshold") {
        setThreshold(String(configuration.threshold));
      }

      if (configuration.model === "barrier") {
        setBarrier(String(configuration.barrier));
      }

      setPolymersConfig(initialConfig);
      setInitialConfigOpen(false);
      setDomainInputs({});
      setConfigurationJsonError("");
    }
    catch (error) {
      setConfigurationJsonError(error.message);
    }
  }


  /*
   * ================================
   * INITIALIZE SIMULATION
   * ================================
   */

  function initializeSimulation() {
    const sim = new TBN_Simulation(
      w,
      {
        model,
        threshold,
        barrier,
      }
    );

    for (const polymerData of polymersConfig) {
      const polymer = sim.createPolymer();

      for (const monomerData of polymerData.monomers) {
        const domains = new Map(
          Object.entries(monomerData.domains)
        );

        polymer.createMonomer(
          monomerData.name,
          domains
        );
      }
    }

    sim.energy = sim.calculate_energy();

    setConfigurationJson(
      JSON.stringify(
        polymersConfig,
        null,
        2
      )
    );

    setSimulation(sim);
    setMoveVersion((v) => v + 1);
  }

  /*
   * ================================
   * RESET
   * ================================
   */

  function resetSimulation() {
    setSimulation(null);
    setMoveVersion((v) => v + 1);
  }

  /*
   * ================================
   * RANDOM STEP
   * ================================
   */

  function randomStep() {
    if (!simulation) {
      return;
    }

    const merges = simulation.validMerges();
    const splits = simulation.validSplits();

    const possibleMoves = [
      ...merges.map(
        (merge) => ({
          type: "merge",
          polymer1: merge.polymers[0],
          polymer2: merge.polymers[1],
        })
      ),

      ...splits.map(
        (split) => ({
          type: "split",
          polymer: split.polymer,
          splitMonomers: split.split_monomers,
        })
      ),
    ];

    if (possibleMoves.length === 0) {
      return;
    }

    const move =
      possibleMoves[
        Math.floor(
          Math.random() *
          possibleMoves.length
        )
      ];

    if (move.type === "merge") {
      simulation.merge(
        move.polymer1,
        move.polymer2
      );
    }

    if (move.type === "split") {
      simulation.split(
        move.polymer,
        move.splitMonomers
      );
    }

    setMoveVersion((v) => v + 1);
  }

  /*
   * ================================
   * EXECUTE MERGE
   * ================================
   */

  function executeMerge(
    polymer1,
    polymer2
  ) {
    if (!simulation) {
      return;
    }

    simulation.merge(
      polymer1,
      polymer2
    );

    setMoveVersion((v) => v + 1);
  }

  /*
   * ================================
   * EXECUTE SPLIT
   * ================================
   */

  function executeSplit(
    polymer,
    splitMonomers
  ) {
    if (!simulation) {
      return;
    }

    simulation.split(
      polymer,
      splitMonomers
    );

    setMoveVersion((v) => v + 1);
  }

  /*
   * ================================
   * POLYMER CONFIGURATION
   * ================================
   */

  function addPolymer() {
    setPolymersConfig((current) => [
      ...current,

      {
        name: `P${current.length + 1}`,
        monomers: [],
      },
    ]);
  }

  function removePolymer(index) {
    setPolymersConfig((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );
  }

  /*
   * ================================
   * MONOMER CONFIGURATION
   * ================================
   */

  function addMonomer(polymerIndex) {
    setPolymersConfig((current) =>
      current.map((polymer, index) =>
        index === polymerIndex
          ? {
              ...polymer,

              monomers: [
                ...polymer.monomers,

                {
                  name:
                    `M${polymer.monomers.length + 1}`,

                  domains: {
                    a: 1,
                  },
                },
              ],
            }

          : polymer
      )
    );
  }

  function removeMonomer(
    polymerIndex,
    monomerIndex
  ) {
    const key =
      `${polymerIndex}-${monomerIndex}`;

    setDomainInputs((current) => {
      const updated = { ...current };

      delete updated[key];

      return updated;
    });

    setPolymersConfig((current) =>
      current.map((polymer, index) =>
        index === polymerIndex
          ? {
              ...polymer,

              monomers:
                polymer.monomers.filter(
                  (_, i) =>
                    i !== monomerIndex
                ),
            }

          : polymer
      )
    );
  }

  /*
   * ================================
   * MONOMER NAME
   * ================================
   */

  function updateMonomerName(
    polymerIndex,
    monomerIndex,
    name
  ) {
    setPolymersConfig((current) =>
      current.map(
        (polymer, pIndex) =>
          pIndex === polymerIndex
            ? {
                ...polymer,

                monomers:
                  polymer.monomers.map(
                    (monomer, mIndex) =>
                      mIndex === monomerIndex
                        ? {
                            ...monomer,
                            name,
                          }

                        : monomer
                  ),
              }

            : polymer
      )
    );
  }

  /*
   * ================================
   * MONOMER DOMAINS
   * ================================
   */

  function updateMonomerDomains(
    polymerIndex,
    monomerIndex,
    value
  ) {
    const key =
      `${polymerIndex}-${monomerIndex}`;

    setDomainInputs((current) => ({
      ...current,
      [key]: value,
    }));

    try {
      const domains = JSON.parse(value);

      if (
        domains === null ||
        typeof domains !== "object" ||
        Array.isArray(domains)
      ) {
        return;
      }

      setPolymersConfig((current) =>
        current.map(
          (polymer, pIndex) =>
            pIndex === polymerIndex
              ? {
                  ...polymer,

                  monomers:
                    polymer.monomers.map(
                      (monomer, mIndex) =>
                        mIndex === monomerIndex
                          ? {
                              ...monomer,
                              domains,
                            }

                          : monomer
                    ),
                }

              : polymer
        )
      );
    }
    catch {
      // Invalid JSON while typing.
    }
  }

  /*
   * ================================
   * CURRENT MOVES
   * ================================
   */

  const merges =
    simulation
      ? simulation.validMerges()
      : [];

  const splits =
    simulation
      ? simulation.validSplits()
      : [];

  /*
   * ================================
   * CURRENT POLYMERS
   * ================================
   */

  const polymers =
    simulation
      ? [...simulation.polymers.values()]
      : [];

  return (
    <div className="app">

      {/* =========================
          HEADER
      ========================== */}

      <header className="header">

        <div>

          <h1>
            TBN Simulator
          </h1>

          <p>
            Thermodynamic Binding Network
            Simulation
          </p>

        </div>

        {simulation && (

          <div className="energy-display">

            <span>
              Energy
            </span>

            <strong>
              {Number(
                simulation.energy
              ).toFixed(3)}
            </strong>

          </div>

        )}

      </header>

      {/* =========================
          MAIN
      ========================== */}

      <main className="layout">

        {/* =======================
            SIDEBAR
        ======================== */}

        <aside className="sidebar">

          {/* MODEL */}

          <section className="panel">

            <h2>
              Simulation Model
            </h2>

            <label>

              Model

              <select
                value={model}
                onChange={(event) =>
                  setModel(
                    event.target.value
                  )
                }
              >

                <option value="barrier">
                  Barrier
                </option>

                <option value="greedy">
                  Greedy
                </option>

                <option value="threshold">
                  Threshold
                </option>

              </select>

            </label>

            <label>

              w

              <input
                type="text"
                value={w}
                onChange={(event) =>
                  setW(
                    event.target.value
                  )
                }
                placeholder="e.g. 1/3"
              />

            </label>

            {model === "threshold" && (

              <label>

                Threshold

                <input
                  type="text"
                  value={threshold}
                  onChange={(event) =>
                    setThreshold(
                      event.target.value
                    )
                  }
                  placeholder="e.g. 1/3"
                />

              </label>

            )}

            {model === "barrier" && (

              <label>

                Barrier

                <input
                  type="text"
                  value={barrier}
                  onChange={(event) =>
                    setBarrier(
                      event.target.value
                    )
                  }
                  placeholder="e.g. 1/3"
                />

              </label>

            )}

          </section>

          {/* =======================
              INITIAL CONFIGURATION
          ======================== */}

          <section className="panel">

            <div className="panel-heading">

              <button
                className="collapse-button"
                onClick={() =>
                  setInitialConfigOpen(
                    (open) => !open
                  )
                }
                aria-expanded={
                  initialConfigOpen
                }
              >

                <span
                  className={`collapse-icon ${
                    initialConfigOpen
                      ? "open"
                      : ""
                  }`}
                >
                  ›
                </span>

                <h2>
                  Initial Configuration
                </h2>

              </button>

              {initialConfigOpen && (

                <button
                  className="add-polymer"
                  onClick={addPolymer}
                >
                  + Polymer
                </button>

              )}

            </div>

            {initialConfigOpen && (

              <div className="polymer-editor">

                {polymersConfig.map(
                  (
                    polymer,
                    polymerIndex
                  ) => (

                    <div
                      className="polymer-card"
                      key={polymerIndex}
                    >

                      <div className="polymer-card-header">

                        <div>

                          <h3>
                            {polymer.name}
                          </h3>

                          <span>
                            {
                              polymer.monomers.length
                            }{" "}
                            {
                              polymer.monomers.length ===
                              1
                                ? "monomer"
                                : "monomers"
                            }
                          </span>

                        </div>

                        <button
                          className="delete-button"
                          onClick={() =>
                            removePolymer(
                              polymerIndex
                            )
                          }
                        >
                          ×
                        </button>

                      </div>

                      <div className="monomer-cards">

                        {polymer.monomers.map(
                          (
                            monomer,
                            monomerIndex
                          ) => {

                            const domainKey =
                              `${polymerIndex}-${monomerIndex}`;

                            return (

                              <div
                                className="monomer-card"
                                key={
                                  monomerIndex
                                }
                              >

                                <input
                                  className="name-input"
                                  value={
                                    monomer.name
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateMonomerName(
                                      polymerIndex,
                                      monomerIndex,
                                      event.target.value
                                    )
                                  }
                                />

                                <input
                                  className="domains-input"
                                  value={
                                    domainInputs[
                                      domainKey
                                    ] ??
                                    JSON.stringify(
                                      monomer.domains
                                    )
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateMonomerDomains(
                                      polymerIndex,
                                      monomerIndex,
                                      event.target.value
                                    )
                                  }
                                />

                                <button
                                  className="delete-button"
                                  onClick={() =>
                                    removeMonomer(
                                      polymerIndex,
                                      monomerIndex
                                    )
                                  }
                                >
                                  ×
                                </button>

                              </div>

                            );
                          }
                        )}

                      </div>

                      <button
                        className="add-monomer"
                        onClick={() =>
                          addMonomer(
                            polymerIndex
                          )
                        }
                      >
                        + Add Monomer
                      </button>

                    </div>

                  )
                )}

              </div>

            )}

            <div className="configuration-actions">

              <button
                className="primary-button"
                onClick={
                  initializeSimulation
                }
              >
                Initialize Simulation
              </button>

              <button
                className="secondary-button"
                onClick={
                  resetSimulation
                }
              >
                Reset
              </button>

            </div>

          </section>

          {/* =======================
              JSON CONFIGURATION
          ======================== */}

          <section className="panel">

            <div className="panel-heading">

              <button
                className="collapse-button"
                onClick={() =>
                  setJsonConfigOpen(
                    (open) => !open
                  )
                }
                aria-expanded={
                  jsonConfigOpen
                }
              >

                <span
                  className={`collapse-icon ${
                    jsonConfigOpen
                      ? "open"
                      : ""
                  }`}
                >
                  ›
                </span>

                <h2>
                  JSON Configuration
                </h2>

              </button>

            </div>

            {jsonConfigOpen && (

              <div className="json-configuration">

                <label>
                  Initial Configuration JSON
                </label>

                <textarea
                  value={configurationJson}
                  onChange={(event) => {
                    setConfigurationJson(
                      event.target.value
                    );

                    setConfigurationJsonError("");
                  }}
                  rows={12}
                  spellCheck={false}
                />

                {configurationJsonError && (

                  <div className="json-error">
                    {configurationJsonError}
                  </div>

                )}

                <button
                  className="secondary-button"
                  onClick={
                    loadConfigurationJson
                  }
                >
                  Load JSON Configuration
                </button>

              </div>

            )}

          </section>

          {/* =======================
              SIMULATION CONTROLS
          ======================== */}

          {simulation && (

            <section className="panel">

              <h2>
                Simulation
              </h2>

              <div className="move-count">

                <span>
                  Polymers
                </span>

                <strong>
                  {polymers.length}
                </strong>

              </div>

              <div className="move-count">

                <span>
                  Valid merges
                </span>

                <strong>
                  {merges.length}
                </strong>

              </div>

              <div className="move-count">

                <span>
                  Valid splits
                </span>

                <strong>
                  {splits.length}
                </strong>

              </div>

              <button
                className="primary-button"
                onClick={randomStep}
              >
                Random Step
              </button>

            </section>

          )}

        </aside>

        {/* =======================
            BOARD
        ======================== */}

        <section className="simulation-area">

          <div className="board-toolbar">

            <div>

              <strong>
                Configuration
              </strong>

              {simulation && (

                <span>
                  {polymers.length} polymers
                </span>

              )}

            </div>

            {simulation && (

              <div className="toolbar-buttons">

                <button
                  onClick={randomStep}
                >
                  Step
                </button>

              </div>

            )}

          </div>

          {simulation && (

            <div className="board">

              {polymers.map(
                (polymer) => (

                  <PolymerView
                    key={polymer.name}
                    polymer={polymer}
                  />

                )
              )}

            </div>

          )}

        </section>

      </main>

      {/* =========================
          VALID MOVES
      ========================== */}

      {simulation && (

        <section className="moves-panel">

          <h2>
            Valid Transitions
          </h2>

          <div className="move-list">

            {/* MERGES */}

            {merges.map(
              (
                merge,
                index
              ) => {

                const [
                  polymer1,
                  polymer2
                ] = merge.polymers;

                return (

                  <button
                    className="move-card"
                    key={`merge-${index}`}
                    onClick={() =>
                      executeMerge(
                        polymer1,
                        polymer2
                      )
                    }
                  >

                    <span className="move-type">
                      MERGE
                    </span>

                    <span>
                      {polymer1.name}
                      {" + "}
                      {polymer2.name}
                    </span>

                  </button>

                );
              }
            )}

            {/* SPLITS */}

            {splits.map(
              (
                split,
                index
              ) => {

                const polymer =
                  split.polymer;

                const splitMonomers =
                  split.split_monomers;

                return (

                  <button
                    className="move-card"
                    key={`split-${index}`}
                    onClick={() =>
                      executeSplit(
                        polymer,
                        splitMonomers
                      )
                    }
                  >

                    <span className="move-type">
                      SPLIT
                    </span>

                    <span>
                      {polymer.name}
                      {" → "}

                      {splitMonomers
                        .map(
                          (monomer) =>
                            monomer.name
                        )
                        .join(", ")}
                    </span>

                  </button>

                );
              }
            )}

            {/* NO MOVES */}

            {merges.length === 0 &&
              splits.length === 0 && (

                <div className="no-moves">
                  No valid transitions.
                </div>

              )}

          </div>

        </section>

      )}

    </div>
  );
}

/* =================================
   POLYMER VIEW
================================= */

function PolymerView({ polymer }) {

  return (
    <div className="card polymer-card">

      <div className="card-header polymer-card-header">

        <div>

          <h5 className="mb-1">
            {polymer.name}
          </h5>

          <small className="text-muted">
            {polymer.monomers.size}{" "}
            {polymer.monomers.size === 1
              ? "monomer"
              : "monomers"}
          </small>

        </div>

      </div>

      <div className="card-body">

        <div className="polymers">
          {[...polymer.monomers.values()].map(
            (monomer) => (

              <MonomerView
                key={monomer.name}
                monomer={monomer}
              />

            )
          )}
        </div>
      </div>

    </div>
  );
}

/* =================================
   MONOMER VIEW
================================= */

function MonomerView({ monomer }) {

  return (
    <div className="card monomer-card">

      <div className="card-body">

        <div className="domains">

          {[...monomer.domains].map(
            ([domain, quantity]) => {

              const amount = Number(quantity);

              return (
                <div
                  className={`domain ${
                    amount >= 0
                      ? "positive-domain"
                      : "negative-domain"
                  }`}
                  key={domain}
                >

                  <span>
                    {domain + " "}:{" "}
                  </span>

                  <strong>
                    {amount >= 0
                      ? `+${amount}`
                      : amount}
                  </strong>

                </div>
              );
            }
          )}

        </div>

        <div className="monomer-name">
          {monomer.name}
        </div>

      </div>

    </div>
  );
}
