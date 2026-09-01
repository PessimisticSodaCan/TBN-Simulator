
import { useState } from "react";
import { TBN_Simulation } from "./TBN_Simulation.js";

const DEFAULT_POLYMERS = [
  {
    name: "P1",
    monomers: [
      {
        name: "A",
        domains: {
          x: 1,
          y: -1,
        },
      },
    ],
  },
  {
    name: "P2",
    monomers: [
      {
        name: "B",
        domains: {
          x: -1,
          z: 1,
        },
      },
    ],
  },
  {
    name: "P3",
    monomers: [
      {
        name: "C",
        domains: {
          y: 1,
          z: -1,
        },
      },
    ],
  },
];

export function Simulator() {
  const [model, setModel] = useState("barrier");

  // Keep these as strings so values such as "1/3" are allowed.
  const [w, setW] = useState("1");
  const [threshold, setThreshold] = useState("0");
  const [barrier, setBarrier] = useState("0");

  const [polymersConfig, setPolymersConfig] =
    useState(DEFAULT_POLYMERS);

  // Controls whether Initial Configuration is expanded.
  const [initialConfigOpen, setInitialConfigOpen] =
    useState(true);

  // Stores the raw text currently being typed into
  // each domain input.
  const [domainInputs, setDomainInputs] =
    useState({});

  const [simulation, setSimulation] =
    useState(null);

  const [, setMoveVersion] = useState(0);


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

    // Create each polymer from the starting configuration.
    for (const polymerData of polymersConfig) {

      const polymer = sim.createPolymer();

      // Add each monomer to this polymer.
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

    setSimulation(sim);
    setMoveVersion((v) => v + 1);

    // Collapse the configuration after initialization.
    setInitialConfigOpen(false);
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
        ([polymer1, polymer2]) => ({
          type: "merge",
          polymer1,
          polymer2,
        })
      ),

      ...splits.map(
        ([polymer, splitMonomers]) => ({
          type: "split",
          polymer,
          splitMonomers,
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

  function executeMerge(polymer1, polymer2) {
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
    // Remove the temporary domain input value.
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

    // Always store the text being typed.
    // This allows the user to temporarily
    // have invalid JSON while editing.
    setDomainInputs((current) => ({
      ...current,
      [key]: value,
    }));

    try {
      const domains = JSON.parse(value);

      // Make sure the parsed value is an object.
      if (
        domains === null ||
        typeof domains !== "object" ||
        Array.isArray(domains)
      ) {
        return;
      }

      // Update the actual configuration only
      // when the JSON is valid.
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

    } catch {
      // Invalid JSON while typing.
      // This is okay because the raw text
      // is stored in domainInputs.
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

              <>

                {/* POLYMER CARDS */}

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

                        {/* POLYMER HEADER */}

                        <div className="polymer-card-header">

                          <div>

                            <h3>
                              {polymer.name}
                            </h3>

                            <span>
                              {
                                polymer.monomers.length
                              }
                              {" "}
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


                        {/* MONOMERS */}

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
                                        event
                                          .target
                                          .value
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
                                        event
                                          .target
                                          .value
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


                        {/* ADD MONOMER */}

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


                {/* CONFIGURATION ACTIONS */}

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

              </>

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


          {/* SIMULATION BOARD */}

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
                [polymer1, polymer2],
                index
              ) => (

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

              )
            )}


            {/* SPLITS */}

            {splits.map(
              (
                [polymer, splitMonomers],
                index
              ) => (

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

              )
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

      {/* POLYMER HEADER */}

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


      {/* MONOMERS */}

      <div className="card-body">

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
  );
}


/* =================================
   MONOMER VIEW
================================= */

function MonomerView({ monomer }) {

  return (
    <div className="card monomer-card">

      {/* DOMAINS */}

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
                    {domain + " "}:
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

