import { apiGetJson } from './httpClient';

export type Substitute = {
  id: number;
  name: string;
  /** Backend returns a stringified decimal like "0.70". */
  closeness: number;
  notes: string;
};

export type SubstituteCategory = 'flavor' | 'texture' | 'chemical';

export type SubstituteGroups = {
  ingredient: { id: number; name: string };
  flavor: Substitute[];
  texture: Substitute[];
  chemical: Substitute[];
};

type RawSubstitute = {
  id: number | string;
  name?: string;
  closeness?: string | number;
  notes?: string;
};

type RawResponse = {
  ingredient?: { id?: number | string; name?: string };
  flavor?: RawSubstitute[];
  texture?: RawSubstitute[];
  chemical?: RawSubstitute[];
};

function pick(list: RawSubstitute[] | undefined): Substitute[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((s) => {
      const id = Number(s.id);
      if (!Number.isFinite(id)) return null;
      const closenessRaw = s.closeness;
      const closeness =
        typeof closenessRaw === 'number'
          ? closenessRaw
          : typeof closenessRaw === 'string'
            ? Number(closenessRaw)
            : 0;
      return {
        id,
        name: typeof s.name === 'string' ? s.name : '',
        closeness: Number.isFinite(closeness) ? closeness : 0,
        notes: typeof s.notes === 'string' ? s.notes : '',
      };
    })
    .filter((s): s is Substitute => s !== null);
}

export async function fetchSubstitutes(ingredientId: number | string): Promise<SubstituteGroups> {
  const data = await apiGetJson<RawResponse>(`/api/ingredients/${ingredientId}/substitutes/`);
  return {
    ingredient: {
      id: Number(data.ingredient?.id ?? ingredientId),
      name: typeof data.ingredient?.name === 'string' ? data.ingredient.name : '',
    },
    flavor: pick(data.flavor),
    texture: pick(data.texture),
    chemical: pick(data.chemical),
  };
}
