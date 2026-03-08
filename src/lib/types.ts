export interface Family {
  id: string;
  family_name: string;
  invite_code: string;
  created_at: string;
}

export interface Profile {
  id: string;
  family_id: string | null;
  full_name: string;
  created_at: string;
}

export interface ShoppingItem {
  id: string;
  family_id: string;
  item_name: string;
  category: string;
  is_bought: boolean;
  added_by: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: "todo" | "done";
  type: "exam" | "chore";
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      families: {
        Row: Family;
        Insert: Omit<Family, "id" | "created_at">;
        Update: Partial<Omit<Family, "id" | "created_at">>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      shopping_list: {
        Row: ShoppingItem;
        Insert: Omit<ShoppingItem, "id" | "created_at">;
        Update: Partial<Omit<ShoppingItem, "id" | "created_at">>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at">;
        Update: Partial<Omit<Task, "id" | "created_at">>;
      };
    };
  };
};
