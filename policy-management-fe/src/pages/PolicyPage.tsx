import React from "react";
import PolicyList from "../components/policy/PolicyList";
import { deletePolicy } from "../services/policy.service";

export const PolicyPage: React.FC = () => {
  // Delete handler
  const handleDeletePolicy = async (id: string) => {
    await deletePolicy(id);
  };

  // Show list
  return (
    <div className="p-2">
      <PolicyList
        onDeletePolicy={handleDeletePolicy}
      />
    </div>
  );
};