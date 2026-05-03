import { useEffect, useRef, useState } from "react";
import { getAblyClient } from "@/lib/ablyClient";

export interface BidOffer {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_phone: string | null;
  driver_vehicle: string | null;
  driver_plate: string | null;
  driver_rating: number;
  offered_fare: number;
  eta: number;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

export type BidStatus =
  | "open"
  | "accepted"
  | "cancelled"
  | "expired"
  | "no_offers";

export interface BidState {
  bidId: string | null;
  status: BidStatus;
  offers: BidOffer[];
  acceptedOffer: BidOffer | null;
}

export function useAblyBid(bidId: string | null): {
  state: BidState;
  connected: boolean;
} {
  const [state, setState] = useState<BidState>({
    bidId,
    status: "open",
    offers: [],
    acceptedOffer: null,
  });
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<ReturnType<
    NonNullable<ReturnType<typeof getAblyClient>>["channels"]["get"]
  > | null>(null);

  useEffect(() => {
    if (!bidId) return;

    const client = getAblyClient();
    if (!client) return;

    const channel = client.channels.get(`bid:${bidId}`);
    channelRef.current = channel;

    channel.subscribe("bid:offer", (msg) => {
      const offer = msg.data as BidOffer;
      setState((prev) => ({
        ...prev,
        offers: [offer, ...prev.offers.filter((o) => o.id !== offer.id)],
      }));
    });

    channel.subscribe("bid:accepted", (msg) => {
      const { offer } = msg.data as { offer: BidOffer };
      setState((prev) => ({
        ...prev,
        status: "accepted",
        acceptedOffer: offer,
      }));
    });

    channel.subscribe("bid:cancelled", () => {
      setState((prev) => ({ ...prev, status: "cancelled" }));
    });

    channel.subscribe("bid:expired", () => {
      setState((prev) => ({ ...prev, status: "expired" }));
    });

    channel.subscribe("bid:offer_rejected", (msg) => {
      const { offer_id } = msg.data as { offer_id: string };
      setState((prev) => ({
        ...prev,
        offers: prev.offers.map((o) =>
          o.id === offer_id ? { ...o, status: "rejected" } : o
        ),
      }));
    });

    client.connection.on("connected", () => setConnected(true));
    client.connection.on("disconnected", () => setConnected(false));
    client.connection.on("failed", () => setConnected(false));

    if (client.connection.state === "connected") setConnected(true);

    return () => {
      channel.unsubscribe();
      channel.detach().catch(() => {});
    };
  }, [bidId]);

  return { state, connected };
}
