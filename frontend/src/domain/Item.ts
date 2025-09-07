// client/domain/Item.ts
export type ItemType =
  | "Héroes"
  | "Armas"
  | "Armaduras"
  | "Ítems"
  | "Habilidades especiales"
  | "Épicas";

export type HeroType =
  | "Guerrero Tanque"
  | "Guerrero Armas"
  | "Mago Fuego"
  | "Mago Hielo"
  | "Pícaro Veneno"
  | "Pícaro Machete"
  | "Chamán"
  | "Médico";

export interface Item {
  id: string;
  userId: string;
  name: string;
  description: string;
  type: ItemType;
  heroType?: HeroType;
  isAvailable: boolean;
  imagen: string;
}
