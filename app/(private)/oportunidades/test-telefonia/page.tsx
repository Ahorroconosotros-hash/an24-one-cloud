"use client";

import { useEffect, useMemo, useState } from "react";

type Provider = {
  id: string;
  service?: string | null;
  name: string;
  active?: boolean | null;
};

type Product = {
  id: string;
  name: string;
  service?: string | null;
  category?: string | null;
  provider_id?: string | null;
  description?: string | null;
  active?: boolean | null;
  product_type?: string | null;
  operation_type?: string | null;
  pvp?: number | null;
  config?: Record<string, any> | null;
};

export default function TestTelefoniaPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [providerId, setProviderId] = useState("");
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/catalog", {
        cache: "no-store",
      });

      const data = await response.json();

      const telProviders = (data.providers || []).filter(
        (p: Provider) =>
          p.active !== false &&
          String(p.service || "").toLowerCase() === "telefonía"
      );

      const telProducts = (data.products || []).filter(
        (p: Product) =>
          p.active !== false &&
          String(p.service || p.category || "").toLowerCase() ===
            "telefonía"
      );

      setProviders(telProviders);
      setProducts(telProducts);

      if (telProviders.length > 0) {
        setProviderId(telProviders[0].id);
      }

      setLoading(false);
    }

    load();
  }, []);

  const providerProducts = useMemo(() => {
    return products.filter((p) => p.provider_id === providerId);
  }, [products, providerId]);

  useEffect(() => {
    setProductId(providerProducts[0]?.id || "");
  }, [providerId, providerProducts]);

  const selectedProduct = products.find((p) => p.id === productId);

  if (loading) {
    return <div style={{ padding: 30 }}>Cargando catálogo...</div>;
  }

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: 30,
      }}
    >
      <h1>Test oportunidad · Telefonía</h1>

      <p>
        Selecciona operador y producto. Las características salen
        directamente del catálogo.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginTop: 30,
        }}
      >
        <label>
          Operador

          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            style={{
              width: "100%",
              height: 45,
              marginTop: 8,
            }}
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Producto

          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            style={{
              width: "100%",
              height: 45,
              marginTop: 8,
            }}
          >
            {providerProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedProduct && (
        <div
          style={{
            marginTop: 30,
            border: "1px solid #ddd",
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              opacity: 0.6,
            }}
          >
            PRODUCTO SELECCIONADO
          </div>

          <h2>{selectedProduct.name}</h2>

          <p>
            {selectedProduct.description ||
              selectedProduct.config?.features ||
              "Sin descripción"}
          </p>

          <hr
            style={{
              margin: "20px 0",
              border: 0,
              borderTop: "1px solid #eee",
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 15,
            }}
          >
            <Dato
              label="Tipo"
              value={
                selectedProduct.product_type ||
                selectedProduct.config?.phone_type
              }
            />

            <Dato
              label="Fibra"
              value={selectedProduct.config?.fiber_speed}
            />

            <Dato
              label="Líneas"
              value={selectedProduct.config?.mobile_lines}
            />

            <Dato
              label="Datos móviles"
              value={selectedProduct.config?.mobile_data}
            />

            <Dato
              label="Operación"
              value={selectedProduct.operation_type}
            />

            <Dato
              label="Precio"
              value={
                selectedProduct.pvp
                  ? `${selectedProduct.pvp} €`
                  : ""
              }
            />
          </div>
        </div>
      )}
    </main>
  );
}

function Dato({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (!value) return null;

  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 12,
        padding: 14,
      }}
    >
      <small>{label}</small>

      <div
        style={{
          marginTop: 5,
          fontWeight: 700,
        }}
      >
        {value}
      </div>
    </div>
  );
}