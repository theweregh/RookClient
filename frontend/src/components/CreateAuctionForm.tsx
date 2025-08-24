import React, { useState } from "react";
import type{ CreateAuctionInput } from "../application/AuctionService";

interface Props {
  onCreate: (input: Omit<CreateAuctionInput, "itemId">) => void;
}

export const CreateAuctionForm: React.FC<Props> = ({ onCreate }) => {
  const [form, setForm] = useState<Omit<CreateAuctionInput, "itemId">>({
    userId: 1,
    startingPrice: 0,
    buyNowPrice: 0,
    durationHours: 24,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(form); // itemId se agrega desde App.tsx
  };

  return (
    <form onSubmit={handleSubmit} className="border p-4 rounded mb-4">
      <input
        type="number"
        name="startingPrice"
        placeholder="Precio inicial"
        onChange={handleChange}
        className="border p-1 m-1"
      />
      <input
        type="number"
        name="buyNowPrice"
        placeholder="Compra rápida"
        onChange={handleChange}
        className="border p-1 m-1"
      />
      <input
        type="number"
        name="durationHours"
        placeholder="Duración (horas)"
        onChange={handleChange}
        className="border p-1 m-1"
      />
      <button type="submit" className="bg-blue-500 text-white px-2 py-1 rounded">
        Crear Subasta
      </button>
    </form>
  );
};
