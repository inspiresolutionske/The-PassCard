import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Supabase on the server
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("CRITICAL: Supabase credentials missing in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: "Supabase configuration is missing on the server." });
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({ error: error.message });
      }

      res.json(data);
    } catch (err: any) {
      console.error("Auth Error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    const { email, password, name } = req.body;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: "Supabase configuration is missing on the server." });
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json(data);
    } catch (err: any) {
      console.error("Signup Error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // --- M-Pesa Daraja API Integration ---

  const getMpesaToken = async () => {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    try {
      const response = await axios.get(
        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );
      return response.data.access_token;
    } catch (error) {
      console.error("Error getting M-Pesa token:", error);
      throw error;
    }
  };

  app.post("/api/mpesa/stkpush", async (req, res) => {
    const { phoneNumber, amount, eventId } = req.body;

    try {
      const token = await getMpesaToken();
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
      const shortCode = process.env.MPESA_SHORTCODE;
      const passkey = process.env.MPESA_PASSKEY;
      const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");

      const payload = {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: shortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: process.env.MPESA_CALLBACK_URL || `${process.env.APP_URL}/api/mpesa/callback`,
        AccountReference: eventId,
        TransactionDesc: `Ticket Purchase for ${eventId}`,
      };

      const response = await axios.post(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      console.error("STK Push Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to initiate STK Push" });
    }
  });

  app.post("/api/mpesa/callback", async (req, res) => {
    const callbackData = req.body.Body.stkCallback;
    console.log("M-Pesa Callback Received:", JSON.stringify(callbackData, null, 2));

    // In a real app, you would verify the callback and update Firestore here.
    // For this environment, the frontend handles the ticket generation after polling success.
    // We'll add an endpoint for the frontend to trigger the email once the ticket is ready.

    res.json({ ResultCode: 0, ResultDesc: "Success" });
  });

  app.post("/api/send-ticket", async (req, res) => {
    const { email, ticketData } = req.body;

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set. Skipping email.");
      return res.status(200).json({ message: "Email skipped (no API key)" });
    }

    try {
      const { data, error } = await resend.emails.send({
        from: "PassCard <onboarding@resend.dev>",
        to: [email],
        subject: `Your Ticket for ${ticketData.eventTitle}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden;">
            <div style="background-color: #151F28; padding: 40px; text-align: center;">
              <h1 style="color: #F9943B; margin: 0;">PassCard</h1>
              <p style="color: white; opacity: 0.8;">Access the Xtraordinary</p>
            </div>
            <div style="padding: 40px;">
              <h2 style="color: #151F28;">Your ticket is ready!</h2>
              <p>Hi ${ticketData.userName},</p>
              <p>Thank you for your purchase. Here are your ticket details for <strong>${ticketData.eventTitle}</strong>:</p>
              <div style="background-color: #f9f9f9; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Ticket ID:</strong> ${ticketData.id}</p>
                <p style="margin: 5px 0;"><strong>Receipt:</strong> ${ticketData.mpesaReceipt}</p>
                <p style="margin: 5px 0;"><strong>Price:</strong> KES ${ticketData.price}</p>
              </div>
              <p>Please present your QR code at the entrance. You can also view your ticket anytime in the "My Tickets" section of the PassCard app.</p>
              <p style="margin-top: 40px; font-size: 12px; color: #999;">If you didn't expect this email, please ignore it.</p>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error("Resend Error:", error);
        return res.status(400).json(error);
      }

      res.status(200).json(data);
    } catch (error) {
      console.error("Email Sending Error:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // --- Vite Middleware / Static Files ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
