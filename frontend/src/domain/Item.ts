// client/domain/Item.ts
export interface Item {
  id: number;
  name: string;
  description: string;
  // cualquier otro campo que devuelva el server de items
}