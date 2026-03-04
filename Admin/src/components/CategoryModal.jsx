import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "./ui/Button";
import { Field, Input, Select } from "./ui/Field";
import { Modal } from "./ui/Modal";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  parentCategory: z.string().optional(),
  status: z.enum(["active", "draft"]),
});

export const CategoryModal = ({ isOpen, onClose, onSubmit, initialValues, loading, categoryOptions = [] }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      parentCategory: "",
      status: "active",
    },
  });

  useEffect(() => {
    reset({
      name: initialValues?.name || "",
      parentCategory: initialValues?.parentCategory || "",
      status: initialValues?.status || "active",
    });
  }, [initialValues, reset, isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialValues ? "Edit Category" : "Add Category"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button loading={loading} type="submit" form="category-form">
            {initialValues ? "Save Changes" : "Create Category"}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <Field
          label="Category Name"
          htmlFor="cat-name"
          helperText="Required"
          error={errors.name?.message}
        >
          <Input id="cat-name" {...register("name")} />
        </Field>
        <Field
          label="Parent Category"
          htmlFor="parentCategory"
          helperText="Optional"
          error={errors.parentCategory?.message}
        >
          <Select id="parentCategory" {...register("parentCategory")}>
            <option value="">None</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Status"
          htmlFor="cat-status"
          helperText="Required"
          error={errors.status?.message}
        >
          <Select id="cat-status" {...register("status")}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </Select>
        </Field>
      </form>
    </Modal>
  );
};
