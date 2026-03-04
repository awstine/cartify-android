import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "./ui/Button";
import { Field, Input, Select, Textarea } from "./ui/Field";
import { Modal } from "./ui/Modal";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  parentId: z.string().optional(),
  imageUrl: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (value) => !value || /^https?:\/\//i.test(value) || /^data:image\/[a-zA-Z+.-]+;base64,/.test(value),
      "Enter a valid image URL or upload an image file"
    ),
});

export const CategoryModal = ({ isOpen, onClose, onSubmit, initialValues, loading, categoryOptions = [] }) => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      parentId: "",
      imageUrl: "",
    },
  });

  useEffect(() => {
    reset({
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      parentId: initialValues?.parentId?._id || initialValues?.parentId || "",
      imageUrl: initialValues?.imageUrl || "",
    });
  }, [initialValues, reset, isOpen]);

  const imageUrlValue = watch("imageUrl");

  const handleImageFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setValue("imageUrl", String(reader.result || ""), { shouldDirty: true, shouldValidate: true });
    };
    reader.readAsDataURL(file);
  };

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
        <Field label="Category Name" htmlFor="cat-name" helperText="Required" error={errors.name?.message}>
          <Input id="cat-name" {...register("name")} />
        </Field>
        <Field label="Parent Category" htmlFor="parentId" helperText="Optional" error={errors.parentId?.message}>
          <Select id="parentId" {...register("parentId")}>
            <option value="">None</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor="cat-description" error={errors.description?.message}>
          <Textarea id="cat-description" rows={3} {...register("description")} />
        </Field>
        <Field label="Category Image URL" htmlFor="cat-image-url" error={errors.imageUrl?.message}>
          <Input id="cat-image-url" {...register("imageUrl")} />
        </Field>
        <Field label="Upload Category Image" htmlFor="cat-image-file" helperText="Optional: upload image from your device">
          <Input id="cat-image-file" type="file" accept="image/*" onChange={handleImageFileChange} />
        </Field>
        {imageUrlValue ? <img src={imageUrlValue} alt="Category preview" className="h-32 w-full rounded-xl border border-slate-200 object-cover" /> : null}
      </form>
    </Modal>
  );
};
