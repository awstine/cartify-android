import { createContext, useContext, useEffect, useMemo } from "react";
const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    // Dark mode has been disabled for the Admin app.
    document.documentElement.classList.remove("dark");
  }, []);

  const value = useMemo(
    () => ({
      theme: "light",
      isDark: false,
      toggleTheme: () => {},
    }),
    []
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
};
