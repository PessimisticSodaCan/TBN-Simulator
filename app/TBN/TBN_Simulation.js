import { create, all } from "mathjs";

const math = create(all);


export class TBN_Simulation {

    constructor(w = "1", model_param = {}) {
        this.w = math.fraction(w);
        this.model = model_param.model;
        this.threshold = math.fraction(model_param.threshold ?? "0");
        this.barrier = math.fraction(model_param.barrier ?? "0");

        this.polymers = new Map();

        this.energy = math.fraction(0);

        this.next_polymer_id = 1;
    }


    createPolymer(monomers = []) {

        const name = `P${this.next_polymer_id}`;

        this.next_polymer_id++;

        const polymer =
            new TBN_Simulation.Polymer(
                this,
                name
            );

        for (const monomer of monomers) {
            polymer.addMonomer(monomer);
        }

        this.polymers.set(
            polymer.name,
            polymer
        );

        return polymer;
    }


    calculate_energy() {

        let total_bonds = 0;

        for (const [polymer_name, polymer] of this.polymers) {

            for (const [domain, domain_data] of polymer.domain_table) {

                total_bonds +=
                    domain_data.count -
                    math.abs(domain_data.aggregate);
            }
        }

        total_bonds = total_bonds / 2;


        const enthalpy = math.multiply(
            this.w,
            total_bonds
        );


        const negative_enthalpy =
            math.multiply(
                math.fraction(-1),
                enthalpy
            );


        this.energy = math.subtract(
            negative_enthalpy,
            this.polymers.size
        );


        return this.energy;
    }


    energy_change(operation, polymers, split_monomers) {

        console.log("================================");
        console.log("ENERGY CHANGE CALCULATION");
        console.log("Operation:", operation);
        console.log("Current energy:", this.energy);
        console.log("w:", this.w);


        /* =========================
           MERGE
        ========================== */

        if (operation === "merge") {

            const polymer_1 = polymers[0];
            const polymer_2 = polymers[1];


            console.log("MERGING:");
            console.log(polymer_1.name, "+", polymer_2.name);


            let total_bonds = 0;


            for (const [domain, polymer_2_domain_data] of polymer_2.domain_table) {

                const polymer_1_domain_data =
                    polymer_1.domain_table.get(domain);


                if (polymer_1_domain_data === undefined) {
                    continue;
                }


                const bonds_1 =
                    polymer_1_domain_data.aggregate;

                const bonds_2 =
                    polymer_2_domain_data.aggregate;


                if (bonds_1 * bonds_2 < 0) {

                    const bonds_formed =
                        Math.min(
                            Math.abs(bonds_1),
                            Math.abs(bonds_2)
                        );

                    total_bonds +=
                        bonds_formed;
                }
            }


            console.log(
                "Total bonds formed:",
                total_bonds
            );


            const enthalpy_change =
                math.multiply(
                    this.w,
                    total_bonds
                );


            console.log(
                "Enthalpy contribution:",
                enthalpy_change
            );


            const energy_change =
                math.subtract(
                    math.fraction(1),
                    enthalpy_change
                );


            console.log(
                "FINAL ENERGY CHANGE:",
                energy_change
            );

            console.log("================================");

            return energy_change;
        }



        else if (operation === "split") {

            const polymer = polymers[0];

            console.log("SPLIT OPERATION");
            console.log("Polymer being split:", polymer.name);


            let bonds_broken = 0;

            const split_domain_table = new Map();


            for (const monomer of split_monomers) {

                for (const [domain, bonds] of monomer.domains) {

                    const entry =
                        (split_domain_table.get(domain) ?? 0) + bonds;

                    split_domain_table.set(
                        domain,
                        entry
                    );
                }
            }


            const polymer_domain_table =
                polymer.domain_table;


            for (const [domain, split_aggregate] of split_domain_table) {

                const polymer_domain_data =
                    polymer_domain_table.get(domain);


                if (polymer_domain_data === undefined) {
                    continue;
                }


                const polymer_aggregate = polymer_domain_data.aggregate;


                const remainder_quantity = polymer_aggregate - split_aggregate;


                if (split_aggregate * remainder_quantity < 0) {

                    bonds_broken += Math.min(
                        Math.abs(split_aggregate),
                        Math.abs(remainder_quantity)
                    );
                }
            }


            console.log(
                "Bonds broken:",
                bonds_broken
            );


            const enthalpy_change =
                math.multiply(
                    this.w,
                    bonds_broken
                );


            const energy_change =
                math.subtract(
                    enthalpy_change,
                    math.fraction(1)
                );


            console.log(
                "FINAL ENERGY CHANGE:",
                energy_change
            );

            console.log("================================");

            return energy_change;
        }
    }


    merge(
        polymer1,
        polymer2
    ) {

        const energy_change =
            this.energy_change(
                "merge",
                [
                    polymer1,
                    polymer2
                ]
            );


        this.energy =
            math.add(
                this.energy,
                energy_change
            );


        for (const monomer of polymer2.monomers.values()) {

            polymer1.addMonomer(
                monomer
            );
        }


        this.polymers.delete(
            polymer2.name
        );


        return polymer1;
    }


    validMerges() {

        const valid_merges = [];

        let lowest_energy_change = null;

        const polymers =
            [...this.polymers.values()];


        for (let i = 0; i < polymers.length; i++) {

            const polymer_i =
                polymers[i];


            for (let j = i + 1; j < polymers.length; j++) {

                const polymer_j =
                    polymers[j];


                const energy_change =
                    this.energy_change(
                        "merge",
                        [
                            polymer_i,
                            polymer_j
                        ]
                    );


                console.log(
                    energy_change
                );


                /* =========================
                   GREEDY
                ========================== */

                if (this.model === "greedy") {

                    if (lowest_energy_change === null || math.compare(energy_change, lowest_energy_change) < 0) {

                        lowest_energy_change =
                            energy_change;

                        valid_merges.length = 0;

                        valid_merges.push(
                            [
                                polymer_i,
                                polymer_j
                            ]
                        );

                    }
                    else if (math.compare(energy_change, lowest_energy_change) === 0) {

                        valid_merges.push(
                            [
                                polymer_i,
                                polymer_j
                            ]
                        );
                    }
                }


                /* =========================
                   THRESHOLD
                ========================== */

                else if (this.model === "threshold") {

                    if (math.compare(energy_change, this.threshold) <= 0) {

                        valid_merges.push(
                            [
                                polymer_i,
                                polymer_j
                            ]
                        );
                    }
                }


                /* =========================
                   BARRIER
                ========================== */

                else if (this.model === "barrier") {

                    const new_energy =
                        math.add(
                            this.energy,
                            energy_change
                        );


                    if (math.compare(this.barrier, new_energy) >= 0) {

                        valid_merges.push(
                            [
                                polymer_i,
                                polymer_j
                            ]
                        );
                    }
                }
            }
        }


        return valid_merges;
    }


    split(
        polymer,
        split_monomers
    ) {

        const energy_change =
            this.energy_change(
                "split",
                [polymer],
                split_monomers
            );


        this.energy =
            math.add(
                this.energy,
                energy_change
            );


        const new_polymer =
            this.createPolymer(
                split_monomers
            );


        for (const monomer of split_monomers) {

            polymer.monomers.delete(
                monomer.name
            );
        }


        for (const [domain, new_polymer_domain_data] of new_polymer.domain_table) {

            const polymer_domain_data =
                polymer.domain_table.get(
                    domain
                );


            polymer_domain_data.aggregate -=
                new_polymer_domain_data.aggregate;

            polymer_domain_data.count -=
                new_polymer_domain_data.count;


            if (polymer_domain_data.count === 0) {

                polymer.domain_table.delete(
                    domain
                );
            }
        }


        return new_polymer;
    }


    validSplits() {

        const valid_splits = [];

        let lowest_energy_change = null;

        const polymers =
            [...this.polymers.values()];


        for (let i = 0; i < polymers.length; i++) {

            const original_polymer =
                polymers[i];


            const polymer_monomers =
                [
                    ...original_polymer.monomers.values()
                ];


            for (let j = 1; j < 2 ** (polymer_monomers.length - 1); j++) {

                const bitmask =
                    j
                        .toString(2)
                        .padStart(
                            polymer_monomers.length,
                            "0"
                        );


                const split_monomers = [];


                for (let bit = 0; bit < bitmask.length; bit++) {

                    if (bitmask[bit] === "1") {

                        split_monomers.push(
                            polymer_monomers[bit]
                        );
                    }
                }


                const energy_change =
                    this.energy_change(
                        "split",
                        [original_polymer],
                        split_monomers
                    );


                /* =========================
                   GREEDY
                ========================== */

                if (this.model === "greedy") {

                    if (lowest_energy_change === null || math.compare(energy_change, lowest_energy_change) < 0) {

                        lowest_energy_change =
                            energy_change;

                        valid_splits.length = 0;

                        valid_splits.push(
                            [
                                original_polymer,
                                split_monomers
                            ]
                        );

                    }
                    else if (math.compare(energy_change, lowest_energy_change) === 0) {

                        valid_splits.push(
                            [
                                original_polymer,
                                split_monomers
                            ]
                        );
                    }
                }


                /* =========================
                   THRESHOLD
                ========================== */

                else if (this.model === "threshold") {

                    if (math.compare(energy_change, this.threshold) <= 0) {

                        valid_splits.push(
                            [
                                original_polymer,
                                split_monomers
                            ]
                        );
                    }
                }


                /* =========================
                   BARRIER
                ========================== */

                else if (this.model === "barrier") {

                    const new_energy =
                        math.add(
                            this.energy,
                            energy_change
                        );


                    if (math.compare(this.barrier, new_energy) >= 0) {

                        valid_splits.push(
                            [
                                original_polymer,
                                split_monomers
                            ]
                        );
                    }
                }
            }
        }


        return valid_splits;
    }
}


TBN_Simulation.Polymer = class {

    constructor(
        simulation,
        name = ""
    ) {

        this.simulation = simulation;
        this.name = name;

        this.monomers = new Map();
        this.domain_table = new Map();
    }


    createMonomer(
        name = "",
        domains = {}
    ) {

        const monomer =
            new TBN_Simulation.Polymer.Monomer(
                this,
                name,
                domains
            );


        this.addMonomer(
            monomer
        );


        return monomer;
    }


    addMonomer(
        monomer
    ) {

        this.monomers.set(
            monomer.name,
            monomer
        );


        monomer.polymer =
            this;


        for (const [domain, quantity] of monomer.domains) {

            const entry =
                this.domain_table.get(domain) ?? {
                    aggregate: 0,
                    count: 0
                };


            entry.aggregate +=
                quantity;


            entry.count +=
                Math.abs(quantity);


            this.domain_table.set(
                domain,
                entry
            );
        }


        return monomer;
    }
};



TBN_Simulation.Polymer.Monomer = class {

    constructor(
        polymer,
        name = "",
        domains = new Map()
    ) {

        this.polymer = polymer;
        this.name = name;
        this.domains = domains;
    }
};