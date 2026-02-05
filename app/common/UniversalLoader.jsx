import React from "react";
import { useAppSelector } from "../store";
import { bookingsState } from "../components/common/common.slice";
import CircleLoader from "./CircleLoader";

/**
 * Universal full-screen loader overlay.
 * Controlled via Redux: `bookingsState.isLoading`.
 * To show/hide from anywhere: dispatch `bookingsAction.handleLoading(true/false)`.
 *
 * Uses the circular brand loader in a full-screen overlay.
 */
const UniversalLoader = () => {
  const { isLoading } = useAppSelector(bookingsState);

  if (!isLoading) return null;

  return <CircleLoader fullScreen />;
};

export default UniversalLoader;


