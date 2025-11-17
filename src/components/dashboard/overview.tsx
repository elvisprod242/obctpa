'use client';

import { useState, useEffect } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

const initialData = [
  { name: 'Jan', total: 0 },
  { name: 'Fév', total: 0 },
  { name: 'Mar', total: 0 },
  { name: 'Avr', total: 0 },
  { name: 'Mai', total: 0 },
  { name: 'Juin', total: 0 },
  { name: 'Juil', total: 0 },
  { name: 'Aoû', total: 0 },
  { name: 'Sep', total: 0 },
  { name: 'Oct', total: 0 },
  { name: 'Nov', total: 0 },
  { name: 'Déc', total: 0 },
];

export function Overview() {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    // This code now runs only on the client, after the component has mounted.
    // This prevents hydration mismatches.
    const generatedData = initialData.map(item => ({
      ...item,
      total: Math.floor(Math.random() * 5000) + 1000,
    }));
    setData(generatedData);
  }, []); // Empty dependency array ensures this runs only once.

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}€`}
        />
        <Bar dataKey="total" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
