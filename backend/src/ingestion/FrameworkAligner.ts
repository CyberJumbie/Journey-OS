import { GraphRepository } from '../repositories/graph.repository';
import type { ExtractedConcept } from './ConceptExtractorNode';

/**
 * FrameworkAligner — maps SubConcepts to USMLE framework nodes.
 *
 * Takes the usmle_system_guess and usmle_discipline_guess from the
 * ConceptExtractorNode output and creates MAPS_TO edges to existing
 * USMLE_System and USMLE_Discipline nodes in Neo4j.
 *
 * Match is fuzzy: "Cardiovascular" matches "Cardiovascular System".
 * If no match is found, the edge is skipped (no garbage edges).
 */
export class FrameworkAligner {
  private readonly graphRepository: GraphRepository;
  private systemNames: string[] | null = null;
  private disciplineNames: string[] | null = null;

  constructor() {
    this.graphRepository = new GraphRepository();
  }

  /**
   * Align all extracted concepts to USMLE frameworks.
   * Creates MAPS_TO edges where matches are found.
   */
  async align(concepts: ExtractedConcept[]): Promise<AlignmentResult> {
    // Cache framework names (one query each)
    await this.loadFrameworkNames();

    let systemMatches = 0;
    let disciplineMatches = 0;
    let skipped = 0;

    // Deduplicate concepts by name to avoid redundant edge creation
    const uniqueConcepts = this.deduplicateByName(concepts);

    for (const concept of uniqueConcepts) {
      // Match USMLE System
      if (concept.usmle_system_guess) {
        const systemMatch = this.fuzzyMatch(
          concept.usmle_system_guess,
          this.systemNames ?? [],
        );

        if (systemMatch) {
          await this.graphRepository.mergeMapToSystem(concept.name, systemMatch);
          systemMatches++;
        } else {
          skipped++;
        }
      }

      // Match USMLE Discipline
      if (concept.usmle_discipline_guess) {
        const disciplineMatch = this.fuzzyMatch(
          concept.usmle_discipline_guess,
          this.disciplineNames ?? [],
        );

        if (disciplineMatch) {
          await this.graphRepository.mergeMapToDiscipline(concept.name, disciplineMatch);
          disciplineMatches++;
        } else {
          skipped++;
        }
      }
    }

    console.log(
      `[FrameworkAligner] Aligned ${uniqueConcepts.length} concepts: ` +
        `${systemMatches} system matches, ${disciplineMatches} discipline matches, ${skipped} skipped`,
    );

    return { systemMatches, disciplineMatches, skipped };
  }

  /**
   * Load USMLE framework node names from Neo4j.
   * Cached for the lifetime of this aligner instance.
   */
  private async loadFrameworkNames(): Promise<void> {
    if (this.systemNames === null) {
      this.systemNames = await this.graphRepository.getAllSystemNames();
      console.log(`[FrameworkAligner] Loaded ${this.systemNames.length} USMLE system names`);
    }

    if (this.disciplineNames === null) {
      this.disciplineNames = await this.graphRepository.getAllDisciplineNames();
      console.log(`[FrameworkAligner] Loaded ${this.disciplineNames.length} USMLE discipline names`);
    }
  }

  /**
   * Fuzzy match a guess string against a list of known names.
   *
   * Strategy:
   * 1. Exact match (case-insensitive)
   * 2. Substring match: "Cardiovascular" matches "Cardiovascular System"
   * 3. Return null if no match (skip — don't create garbage edges)
   */
  private fuzzyMatch(guess: string, knownNames: string[]): string | null {
    const guessLower = guess.toLowerCase().trim();

    // 1. Exact match (case-insensitive)
    const exactMatch = knownNames.find(
      (name) => name.toLowerCase() === guessLower,
    );
    if (exactMatch) return exactMatch;

    // 2. Substring match: guess is contained in known name
    const substringMatch = knownNames.find(
      (name) => name.toLowerCase().includes(guessLower),
    );
    if (substringMatch) return substringMatch;

    // 3. Reverse substring: known name is contained in guess
    const reverseMatch = knownNames.find(
      (name) => guessLower.includes(name.toLowerCase()),
    );
    if (reverseMatch) return reverseMatch;

    // No match — skip
    return null;
  }

  /**
   * Deduplicate concepts by name so we don't create redundant edges.
   */
  private deduplicateByName(concepts: ExtractedConcept[]): ExtractedConcept[] {
    const seen = new Set<string>();
    const unique: ExtractedConcept[] = [];

    for (const concept of concepts) {
      if (!seen.has(concept.name)) {
        seen.add(concept.name);
        unique.push(concept);
      }
    }

    return unique;
  }
}

export interface AlignmentResult {
  systemMatches: number;
  disciplineMatches: number;
  skipped: number;
}
