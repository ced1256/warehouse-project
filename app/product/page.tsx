"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
// Assuming InventoryProduct type is defined, either here or imported from @/types
// import { InventoryProduct } from "@/types";
import Navbar from "@/app/components/navbar"; // Assuming correct path

// --- Type Definition (if not imported) ---
export interface InventoryProduct {
  inventoryid: number;
  productid: number;
  customerid?: number;
  totalquantity: number;
  name: string | null; // Corresponds to product.ProductName
  // Optional: Define the structure Supabase returns for joins if needed for stricter typing
  // product?: { ProductName: string | null }[] | null; // Example of stricter typing for the join result
  customer?: {
    firstname: string | null;
    lastname: string | null;
    email: string | null;
  } | null; // Supabase might also return customer as an array, adjust if needed
}
// -----------------------------------------

// --- SVG Icon for the button (Keep as is) ---
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
    className="w-5 h-5"
  >
    {" "}
    {/* Added className */}
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5v15m7.5-7.5h-15"
    />
  </svg>
);

// --- Search & Clear Icons ---
const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
    />
  </svg>
);

const XCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
    />
  </svg>
);
// -------------------------------

export default function ProductList() {
  // Use the new type and rename state for clarity
  const [inventoryProducts, setInventoryProducts] = useState<
    InventoryProduct[]
  >([]);
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // --- Animation Setup (Keep as is) ---
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const animationBaseClass = "opacity-0 transition-all duration-700 ease-out";
  const animationActiveClass = "opacity-100 translate-y-0";
  const animationInitialClass = "translate-y-5";

  // --- Add input styling classes ---
  const inputBaseClasses =
    "appearance-none block w-full rounded-md px-4 py-2 shadow-sm text-base bg-black/40 text-gray-100 placeholder-gray-500 focus:outline-none transition duration-200";
  const inputBorderNormal =
    "border border-white/20 focus:border-blue-500/50 focus:ring-blue-500/70 focus:ring-1 focus:ring-offset-2 focus:ring-offset-black/80";
  // ---------------------------------

  // --- UPDATED useEffect to fetch from inventoryrecord ---
  useEffect(() => {
    setLoading(true);
    setError(null);
    setUserType(null); // Reset user type on load

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function loadInventoryData() {
      // Renamed function for clarity
      try {
        // 1. Get Session and User (Keep as is)
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError)
          throw new Error(`Session Error: ${sessionError.message}`);
        if (!session?.user?.email) {
          console.log("No active session or email found.");
          setInventoryProducts([]); // Clear data
          setLoading(false);
          return;
        }

        // 2. Determine User Type (Keep as is, using metadata primarily)
        const metadataType = session.user.user_metadata?.type;
        let determinedUserType: string | null = null;
        if (metadataType === "employee" || metadataType === "customer") {
          determinedUserType = metadataType;
        } else {
          // Fallback check
          const { count, error: employeeCheckError } = await supabase
            .from("employee")
            .select("email", { count: "exact", head: true })
            .eq("email", session.user.email);
          if (employeeCheckError) {
            console.error(
              "Employee Check Error (non-blocking):",
              employeeCheckError.message
            );
            determinedUserType = "customer"; // Default assumption on error
          } else {
            determinedUserType = count && count > 0 ? "employee" : "customer";
          }
        }
        setUserType(determinedUserType);

        // --- 3. Fetch Inventory Data based on determined type ---
        let inventoryQuery = supabase.from("inventoryrecord"); // Start query on inventoryrecord

        if (determinedUserType === "customer") {
          // Find the customer ID first
          const { data: customerData, error: customerError } = await supabase
            .from("customer")
            .select("customerid")
            .eq("email", session.user.email);

          if (customerError)
            throw new Error(
              `Failed to fetch customer profile: ${customerError.message}`
            );
          if (!customerData || customerData.length === 0) {
            console.warn(
              "Customer profile not found for email:",
              session.user.email
            );
            setError("Could not find your customer profile to load inventory.");
            setInventoryProducts([]);
            setLoading(false);
            return;
          }
          if (customerData.length > 1) {
            console.error(
              "Data integrity issue: Multiple customer profiles found for email:",
              session.user.email
            );
            setError("An account configuration error occurred.");
            setInventoryProducts([]);
            setLoading(false);
            return;
          }

          const customerId = customerData[0].customerid;
          console.log("Fetching inventory for customer ID:", customerId);

          // Fetch inventory records for this customer, joining product details
          // Explicitly type the expected return structure for better safety
          const { data: inventoryData, error: inventoryError } =
            await inventoryQuery
              .select(
                `
              inventoryid,
              productid,
              customerid,
              totalquantity,
              product ( ProductName )
            `
              )
              .eq("customerid", customerId) // Filter inventory by customerId
              .returns<
                {
                  // Define expected structure more explicitly
                  inventoryid: number;
                  productid: number;
                  customerid: number;
                  totalquantity: number;
                  product: { ProductName: string | null }[] | null; // Expect product as array
                }[]
              >(); // Expect array of these objects

          if (inventoryError) {
            throw new Error(
              `Failed to load inventory: ${inventoryError.message}`
            );
          }

          // Map the result to our InventoryProduct type
          const formattedData =
            inventoryData?.map((item) => ({
              inventoryid: item.inventoryid,
              productid: item.productid,
              customerid: item.customerid,
              totalquantity: item.totalquantity,
              // Fix product name access - ensure proper nesting and check structure
              name:
                Array.isArray(item.product) && item.product.length > 0
                  ? item.product[0]?.ProductName ?? "N/A"
                  : typeof item.product === "object" && item.product !== null
                  ? (item.product as any).ProductName ?? "N/A"
                  : "N/A",
              customer: null, // Customer details not needed in customer view
            })) || [];
          setInventoryProducts(formattedData);
        } else if (determinedUserType === "employee") {
          // For employees, get all inventory records, joining product and customer details
          console.log("Fetching all inventory records for employee.");
          // Explicitly type the expected return structure for better safety
          const { data: inventoryData, error: inventoryError } =
            await inventoryQuery
              .select(
                `
              inventoryid,
              productid,
              customerid,
              totalquantity,
              product ( ProductName ),
              customer ( firstname, lastname, email )
            `
              ) // No customer filter for employee
              .returns<
                {
                  // Define expected structure more explicitly
                  inventoryid: number;
                  productid: number;
                  customerid: number | null; // customerid might be null if allowed
                  totalquantity: number;
                  product: { ProductName: string | null }[] | null; // Expect product as array
                  customer: {
                    // Expect customer as single object or null (adjust if it can be array)
                    firstname: string | null;
                    lastname: string | null;
                    email: string | null;
                  } | null;
                }[]
              >(); // Expect array of these objects

          if (inventoryError) {
            throw new Error(
              `Failed to load inventory: ${inventoryError.message}`
            );
          }

          // Map the result to our InventoryProduct type
          const formattedData =
            inventoryData?.map((item) => ({
              inventoryid: item.inventoryid,
              productid: item.productid,
              customerid: item.customerid ?? undefined,
              totalquantity: item.totalquantity,
              // Fix product name access
              name:
                Array.isArray(item.product) && item.product.length > 0
                  ? item.product[0]?.ProductName ?? "N/A"
                  : typeof item.product === "object" && item.product !== null
                  ? (item.product as any).ProductName ?? "N/A"
                  : "N/A",
              customer: item.customer, // Include fetched customer details (assuming it's an object or null)
            })) || [];
          setInventoryProducts(formattedData);
        } else {
          // Should not happen
          console.warn("User type could not be determined.");
          setInventoryProducts([]);
        }
      } catch (err: any) {
        console.error("Error loading inventory data:", err);
        setError(err.message || "An unexpected error occurred.");
        setInventoryProducts([]); // Clear data on error
      } finally {
        setLoading(false);
      }
    }
    loadInventoryData(); // Call the renamed function
  }, []); // Dependency array remains empty
  // ---------------------------------------------

  // --- Filter products based on search term ---
  const filteredProducts = useMemo(() => {
    if (!searchTerm) {
      return inventoryProducts;
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return inventoryProducts.filter((product) => {
      // Product name search
      const nameMatch = product.name
        ? product.name.toLowerCase().includes(lowerCaseSearchTerm)
        : false;

      // Product ID search
      const productIdMatch = product.productid
        .toString()
        .includes(lowerCaseSearchTerm);

      // Inventory ID search
      const inventoryIdMatch = product.inventoryid
        .toString()
        .includes(lowerCaseSearchTerm);

      // Quantity search
      const quantityMatch = product.totalquantity
        .toString()
        .includes(lowerCaseSearchTerm);

      // Customer name search (only if customer exists)
      let customerMatch = false;
      if (product.customer) {
        const firstName = product.customer.firstname || "";
        const lastName = product.customer.lastname || "";
        customerMatch =
          firstName.toLowerCase().includes(lowerCaseSearchTerm) ||
          lastName.toLowerCase().includes(lowerCaseSearchTerm) ||
          `${firstName} ${lastName}`
            .toLowerCase()
            .includes(lowerCaseSearchTerm);
      }

      // Return true if any of the fields match
      return (
        nameMatch ||
        productIdMatch ||
        inventoryIdMatch ||
        quantityMatch ||
        customerMatch
      );
    });
  }, [searchTerm, inventoryProducts]);

  // --- Loading/Error States (Keep as is) ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-400">
        Loading inventory data...
      </div>
    );
  }

  if (error && inventoryProducts.length === 0) {
    // Check new state variable name
    return (
      <div className="min-h-screen flex flex-col bg-gray-950 text-red-400">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center px-6 text-center">
          <p className="text-xl mb-4">Error</p>
          <p>{error}</p>
          <Link href="/" className="mt-6 text-blue-400 hover:text-blue-300">
            Go Home
          </Link>
        </div>
      </div>
    );
  }
  // ---------------------------------

  // --- Component Render (JSX remains the same) ---
  return (
    // --- Themed Root Container (Keep as is) ---
    <div className="relative min-h-screen flex flex-col bg-gray-950 text-gray-100 overflow-y-auto">
      <Navbar />
      {/* --- Max Width Content Container (Keep as is) --- */}
      <div className="flex-grow flex flex-col items-center w-full px-4 pt-8 pb-12 sm:px-6 lg:px-8">
        {/* Animation Container (Keep as is) */}
        <div
          className={`relative z-10 w-full max-w-7xl ${animationBaseClass} ${
            isMounted ? animationActiveClass : animationInitialClass
          }`}
          style={{ transitionDelay: isMounted ? "100ms" : "0ms" }}
        >
          {/* --- Themed Header (Update Title) --- */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              {userType === "employee"
                ? "All Inventory Records"
                : "My Inventory"}
            </h1>
            {/* Search Bar */}
            <div className="relative w-full md:w-auto md:flex-grow md:max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="search"
                name="search"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${inputBaseClasses} ${inputBorderNormal} pl-10 pr-10`}
                placeholder="Search by name, ID, quantity..."
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors focus:outline-none"
                  aria-label="Clear search"
                >
                  <XCircleIcon />
                </button>
              )}
            </div>
            {/* Add Product button might need rethinking - does it add to product table or inventoryrecord? */}
            {/* For now, let's assume it adds a new product definition, keep link as is */}
            {userType === "customer" && (
              <Link
                href="/product/add" // This link might need to go to an "Add Inventory" page instead
                className={`inline-flex items-center justify-center gap-2 px-5 py-2 text-base font-semibold text-white rounded-lg shadow-lg bg-gradient-to-r from-blue-600 to-cyan-600 transition-all duration-300 ease-out hover:from-blue-500 hover:to-cyan-500 hover:scale-[1.03] hover:shadow-blue-500/50 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-blue-500/70`}
              >
                <PlusIcon className="w-5 h-5" />
                Add New Product{" "}
                {/* Consider changing text to "Add to Inventory" */}
              </Link>
            )}
          </div>

          {/* --- Themed Table Area (UPDATED Columns) --- */}
          {filteredProducts.length === 0 ? (
            <div className="text-center text-gray-400 mt-10 py-6 rounded-lg bg-white/5 border border-white/10">
              {searchTerm
                ? `No inventory records found matching "${searchTerm}".`
                : userType === "customer"
                ? "You don't have any inventory records yet."
                : "No inventory records found in the system."}
            </div>
          ) : error && filteredProducts.length === 0 ? (
            <p className="text-center text-orange-400 mt-10">
              Could not fully load data: {error}
            </p>
          ) : (
            <div className="overflow-x-auto shadow-xl rounded-lg border border-white/10 bg-white/5">
              <table className="min-w-full divide-y divide-white/10">
                {/* Themed Table Head (UPDATED) */}
                <thead className="bg-black/20">
                  <tr>
                    {/* Use inventoryid as the primary identifier shown */}
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
                    >
                      Inv. ID
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
                    >
                      Product Name
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
                    >
                      Quantity
                    </th>
                    {/* Show Customer column only for employees */}
                    {userType === "employee" && (
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
                      >
                        Customer
                      </th>
                    )}
                    {/* Add Actions column if needed */}
                    {/* <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th> */}
                  </tr>
                </thead>
                {/* Themed Table Body (UPDATED) */}
                <tbody className="divide-y divide-white/10">
                  {filteredProducts.map(
                    (
                      item // Use 'item' for clarity
                    ) => (
                      <tr
                        key={item.inventoryid} // Use inventoryid from inventoryrecord as the unique key
                        className="hover:bg-white/5 transition-colors duration-150"
                      >
                        {/* Inventory ID */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-100">
                          {item.inventoryid}
                        </td>
                        {/* Product Name (from joined product table) */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                          {item.name} {/* Display the mapped 'name' */}
                        </td>
                        {/* Quantity (from inventoryrecord) */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          {item.totalquantity} {/* Display the quantity */}
                        </td>
                        {/* Customer Info (for employees) */}
                        {userType === "employee" && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            {item.customer ? (
                              <>
                                {`${item.customer.firstname ?? ""} ${
                                  item.customer.lastname ?? ""
                                }`.trim()}
                                <br />
                                <span className="text-xs text-gray-400">
                                  {item.customer.email ?? "No email"}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400 italic">N/A</span> // Indicate if customer is missing
                            )}
                          </td>
                        )}
                        {/* Add Actions cell if needed */}
                        {/* <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-3"> */}
                        {/* Action Links/Buttons Here */}
                        {/* </td> */}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
          {/* --- End Table Area --- */}
        </div>{" "}
        {/* End Animation Container */}
      </div>{" "}
      {/* End Max Width Container */}
    </div> // End Root Element
  );
}
