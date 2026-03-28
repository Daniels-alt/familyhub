export interface Family {
  id: string;
  family_name: string;
  invite_code: string;
  child_invite_code: string;
  children_can_add_exams: boolean;
  children_can_add_tasks: boolean;
  children_can_manage_shopping: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  family_id: string | null;
  full_name: string;
  role: "parent" | "child";
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
  assigned_to: string | null;
  created_by: string | null;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  recurrence_end_date: string | null;
  created_at: string;
}

export type FamilyMember = Pick<Profile, "id" | "full_name" | "role">;

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type DietaryType = "dairy" | "meat" | "pareve";

export interface Dish {
  id: string;
  family_id: string;
  name: string;
  meal_type: MealType;
  dietary_type: DietaryType;
  recipe: string | null;
  added_by: string | null;
  created_at: string;
}

export interface DailyVote {
  id: string;
  family_id: string;
  dish_id: string;
  user_id: string;
  meal_type: MealType;
  vote_date: string;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      families: {
        Row: Family;
        Insert: Omit<Family, "id" | "created_at" | "invite_code" | "child_invite_code">;
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
