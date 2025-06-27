import React, { useState } from "react";

const TestHook = () => {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount((c) => c + 1)}>Compteur: {count}</button>
  );
};

export default TestHook;
