import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MappingPreset,
  MappingPresetCreateInput,
} from "@journey-os/types";
import {
  PresetNotFoundError,
  PresetOperationError,
} from "../../errors/import-mapping.errors";

export class MappingPresetService {
  readonly #supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.#supabase = supabase;
  }

  async list(userId: string): Promise<MappingPreset[]> {
    const { data, error } = await this.#supabase
      .from("import_presets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new PresetOperationError("list", error.message);
    }

    return (data ?? []) as MappingPreset[];
  }

  async create(
    userId: string,
    input: MappingPresetCreateInput,
  ): Promise<MappingPreset> {
    const { data, error } = await this.#supabase
      .from("import_presets")
      .insert({
        user_id: userId,
        name: input.name,
        description: input.description ?? "",
        mappings: input.mappings,
        source_format: input.source_format,
      })
      .select()
      .single();

    if (error) {
      throw new PresetOperationError("create", error.message);
    }

    return data as MappingPreset;
  }

  async delete(userId: string, presetId: string): Promise<void> {
    const { error } = await this.#supabase
      .from("import_presets")
      .delete()
      .eq("id", presetId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new PresetNotFoundError(presetId);
    }
  }
}
