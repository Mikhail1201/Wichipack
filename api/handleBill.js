import { createClient } from "@supabase/supabase-js";

// 🔧 Configuración compartida
async function getSupabaseConfig() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    return { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY };
  }

  try {
    const local = await import("../supabaseConfig.js");
    return {
      SUPABASE_URL: SUPABASE_URL || local.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY:
        SUPABASE_SERVICE_ROLE_KEY || local.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY: SUPABASE_ANON_KEY || local.SUPABASE_ANON_KEY,
    };
  } catch (err) {
    throw new Error("No se encontró configuración de Supabase");
  }
}

// 🧾 Obtener facturas
async function getBills(supabase) {
  const { data, error } = await supabase
    .from("facturas")
    .select("*")
    .order("idfactura", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

// 🧩 Controlador principal
export default async function handler(req, res) {
  const method = req.method.toUpperCase();

  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await getSupabaseConfig();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (method) {
      // 📘 OBTENER TODAS LAS FACTURAS o una específica
      case "GET": {
        const { idfactura, includeDetails } = req.query;

        // 🟢 Si se pide una factura con sus detalles
        if (idfactura && includeDetails === "true") {
          const { data: factura, error: factErr } = await supabase
            .from("facturas")
            .select("*")
            .eq("idfactura", idfactura)
            .single();

          if (factErr || !factura) {
            return res.status(404).json({ error: "Factura no encontrada" });
          }

          // Obtener detalles asociados
          const { data: detalles, error: detErr } = await supabase
            .from("detalle_facturas")
            .select("*")
            .eq("idfactura", idfactura)
            .order("iddetalle", { ascending: true });

          if (detErr) throw detErr;

          return res.status(200).json({
            ...factura,
            detalles: detalles || [],
          });
        }

        // 🟢 Si se pide una factura individual sin detalles
        if (idfactura) {
          const { data, error } = await supabase
            .from("facturas")
            .select("*")
            .eq("idfactura", idfactura)
            .single();

          if (error) throw error;
          return res.status(200).json(data);
        }

        // 🟢 Si no hay parámetros, obtener todas
        const facturas = await getBills(supabase);
        return res.status(200).json(facturas);
      }

      // 🟢 CREAR FACTURA (y detalles si vienen)
      case "POST": {
        /**
         * Body esperado (ejemplo):
         * {
         *   subtotal?: number,
         *   iva?: number,
         *   total?: number,
         *   idestado: number,
         *   idcliente?: number,
         *   detalles?: [
         *     { concepto, cantidad, precio_unitario, idalquiler? },
         *     ...
         *   ]
         * }
         */

        const { subtotal, iva, total, idestado, idcliente, detalles } = req.body;

        if (!idestado) {
          return res.status(400).json({ error: "Falta idestado (estado de la factura)" });
        }

        // Validar detalles si vienen
        const detallesArr = Array.isArray(detalles) ? detalles : [];

        // Si no viene subtotal/total, calcular desde detalles
        let computedSubtotal = 0;
        if ((!subtotal || !total) && detallesArr.length > 0) {
          for (const d of detallesArr) {
            const cant = Number(d.cantidad ?? 1);
            const pu = Number(d.precio_unitario ?? 0);
            computedSubtotal += cant * pu;
          }
        }

        const finalSubtotal = Number(subtotal ?? computedSubtotal ?? 0);
        const finalIva = Number(iva ?? 0);
        const finalTotal = Number(total ?? (finalSubtotal + finalIva));

        // 🧮 Obtener último número de factura
        const { data: lastFactura, error: fetchError } = await supabase
          .from("facturas")
          .select("numero_factura")
          .order("idfactura", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fetchError) throw fetchError;

        // Determinar nuevo número de factura
        let newNumero = 1001;
        if (lastFactura && lastFactura.numero_factura) {
          const lastNum = parseInt(lastFactura.numero_factura, 10);
          if (!isNaN(lastNum)) newNumero = lastNum + 1;
        }

        // Obtener último idfactura
        const facturas = await getBills(supabase);
        const lastId = facturas.length ? facturas[facturas.length - 1].idfactura : 0;
        const newId = lastId + 1;

        const fecha = new Date().toISOString();

        // Insertar la factura
        const { data: createdFacturaArr, error: createErr } = await supabase
          .from("facturas")
          .insert([
            {
              idfactura: newId,
              numero_factura: String(newNumero),
              fecha,
              subtotal: finalSubtotal,
              iva: finalIva,
              total: finalTotal,
              idestado,
              idcliente: idcliente ?? null,
            },
          ])
          .select();

        if (createErr) throw createErr;
        const createdFactura = Array.isArray(createdFacturaArr) ? createdFacturaArr[0] : createdFacturaArr;

        // Si no hay detalles, devolvemos la factura creada
        if (!detallesArr.length) {
          return res.status(200).json({
            message: "Factura creada correctamente",
            factura: createdFactura,
            detalles: [],
          });
        }

        // ========== Insertar detalles ==========
        // Obtener último iddetalle existente para autoincrement manual
        const { data: lastDetalleData, error: lastDetErr } = await supabase
          .from("detalle_facturas")
          .select("iddetalle")
          .order("iddetalle", { ascending: false })
          .limit(1);

        if (lastDetErr) throw lastDetErr;
        let nextDetalleId = lastDetalleData?.[0]?.iddetalle ? lastDetalleData[0].iddetalle + 1 : 1;

        // Preparar array de inserts para detalle_facturas
        const detallesToInsert = detallesArr.map((d) => {
          const cantidad = Number(d.cantidad ?? 1);
          const precio_unitario = Number(d.precio_unitario ?? 0);
          const subtotal_det = Number((cantidad * precio_unitario).toFixed(2));
          const row = {
            iddetalle: nextDetalleId++,
            idfactura: createdFactura.idfactura,
            concepto: d.concepto ?? `Item ${createdFactura.idfactura}`,
            cantidad,
            precio_unitario,
            subtotal: subtotal_det,
            idalquiler: d.idalquiler ?? null,
          };
          return row;
        });

        const { data: insertedDetails, error: detInsertErr } = await supabase
          .from("detalle_facturas")
          .insert(detallesToInsert)
          .select();

        if (detInsertErr) throw detInsertErr;

        // ✅ Responder con factura + detalles
        return res.status(200).json({
          message: "Factura y detalles creados correctamente",
          factura: createdFactura,
          detalles: insertedDetails,
        });
      }

      // 🟡 ACTUALIZAR FACTURA
      case "PUT": {
        const { idfactura, subtotal, iva, total, idestado, idcliente } = req.body;
        if (!idfactura) {
          return res.status(400).json({ error: "El campo idfactura es obligatorio" });
        }

        const { data, error } = await supabase
          .from("facturas")
          .update({
            subtotal,
            iva,
            total,
            idestado,
            idcliente,
          })
          .eq("idfactura", idfactura)
          .select();

        if (error) throw error;
        return res.status(200).json({ message: "Factura actualizada", factura: data });
      }

      // 🔴 ELIMINAR FACTURA
      case "DELETE": {
        const id = req.query.idfactura || req.body.idfactura;
        if (!id) {
          return res.status(400).json({ error: "Falta el parámetro idfactura" });
        }

        const { data, error } = await supabase
          .from("facturas")
          .delete()
          .eq("idfactura", id)
          .select();

        if (error) throw error;
        return res.status(200).json({
          message: "Factura eliminada correctamente",
          eliminado: data,
        });
      }

      // 🚫 MÉTODO NO PERMITIDO
      default:
        return res.status(405).json({ error: `Método ${method} no permitido` });
    }
  } catch (err) {
    console.error("❌ Error en handleBill:", err);
    return res.status(500).json({ error: err.message });
  }
}
