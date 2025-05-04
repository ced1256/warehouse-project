export interface Customer {
  customerid: number;
  firstname: string;
  lastname: string;
  email: string;
}

export interface Product {
  productid: number;
  ProductName: string;
  MaxQuantity?: number;
}

export interface Warehouse {
  warehouseid: number;
  warehousename: string;
  status: string;
  address: string;
  city: string;
}

export interface WarehouseZone {
  warehouseid: number;
  zoneid: string;
  subzoneid: number;
  spaceoccupied: number | null;
  spaceavailability: boolean | null;
}
