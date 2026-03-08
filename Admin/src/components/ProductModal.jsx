import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "./ui/Button";
import { Field, Input, Select, Textarea } from "./ui/Field";
import { Modal } from "./ui/Modal";

const COLOR_OPTIONS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Red", hex: "#EF4444" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Green", hex: "#22C55E" },
  { name: "Yellow", hex: "#FACC15" },
  { name: "Orange", hex: "#F97316" },
  { name: "Purple", hex: "#8B5CF6" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Brown", hex: "#92400E" },
  { name: "Gray", hex: "#6B7280" },
  { name: "Navy", hex: "#1E3A8A" },
];

const getColorName = (hex) => COLOR_OPTIONS.find((item) => item.hex.toUpperCase() === String(hex || "").toUpperCase())?.name || "Custom Color";

const schema = z.object({
  title: z.string().min(2, "Name must be at least 2 characters"),
  price: z.coerce.number().min(0, "Price must be positive"),
  costPrice: z.coerce.number().min(0, "Buying price must be positive"),
  salePrice: z.coerce.number().min(0, "Sale price must be positive").optional().or(z.literal("")),
  stockQty: z.coerce.number().int().min(0, "Stock cannot be negative"),
  category: z.string().min(1, "Category is required"),
  status: z.enum(["active", "draft"]),
  description: z.string().optional(),
  imageUrl: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (value) =>
        !value ||
        /^https?:\/\//i.test(value) ||
        /^data:image\/[a-zA-Z+.-]+;base64,/.test(value),
      "Enter a valid image URL or select an image file"
    ),
  images: z
    .array(z.string())
    .max(4, "A product can have up to 4 images")
    .optional(),
  hasSizes: z.boolean().optional(),
  sizesText: z.string().optional(),
  hasColors: z.boolean().optional(),
  colors: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color value")).max(20).optional(),
  variantsJson: z.string().optional(),
}).superRefine((values, ctx) => {
  if (!values.hasSizes) return;
  const parsed = String(values.sizesText || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (parsed.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sizesText"],
      message: "Add at least one size",
    });
  }
  if (values.hasColors && (!Array.isArray(values.colors) || values.colors.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["colors"],
      message: "Add at least one color",
    });
  }
});

export const ProductModal = ({ isOpen, onClose, onSubmit, initialValues, loading, categories = [] }) => {
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
      title: "",
      price: "",
      costPrice: "",
      salePrice: "",
      stockQty: 0,
      category: "general",
      status: "active",
      description: "",
      imageUrl: "",
      images: [],
      hasSizes: false,
      sizesText: "",
      hasColors: false,
      colors: [],
      variantsJson: "[]",
    },
  });
  const [colorInputValue, setColorInputValue] = useState(COLOR_OPTIONS[0].hex);

  useEffect(() => {
    register("images");
    register("colors");
  }, [register]);

  useEffect(() => {
    reset({
      title: initialValues?.title || "",
      price: initialValues?.price ?? "",
      costPrice: initialValues?.costPrice ?? "",
      salePrice: initialValues?.salePrice ?? "",
      stockQty: initialValues?.stockQty ?? 0,
      category: initialValues?.category || "general",
      status: initialValues?.status || "active",
      description: initialValues?.description || "",
      imageUrl: initialValues?.imageUrl || "",
      images: Array.isArray(initialValues?.images) && initialValues.images.length > 0
        ? initialValues.images.slice(0, 4)
        : initialValues?.imageUrl
          ? [initialValues.imageUrl]
          : [],
      hasSizes: Array.isArray(initialValues?.sizes) && initialValues.sizes.length > 0,
      sizesText: Array.isArray(initialValues?.sizes) ? initialValues.sizes.join(", ") : "",
      hasColors: Array.isArray(initialValues?.colors) && initialValues.colors.length > 0,
      colors: Array.isArray(initialValues?.colors) ? initialValues.colors.filter(Boolean).slice(0, 20) : [],
      variantsJson: JSON.stringify(Array.isArray(initialValues?.variants) ? initialValues.variants : [], null, 2),
    });
    setColorInputValue(COLOR_OPTIONS[0].hex);
  }, [initialValues, reset, isOpen]);

  const imageUrlValue = watch("imageUrl");
  const imagesValue = watch("images") || [];
  const hasSizesValue = Boolean(watch("hasSizes"));
  const hasColorsValue = Boolean(watch("hasColors"));
  const colorsValue = watch("colors") || [];

  const handleImageFileChange = (event) => {
    const files = Array.from(event.target.files || []).slice(0, 4);
    if (files.length === 0) return;
    Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.readAsDataURL(file);
          })
      )
    ).then((newImages) => {
      const merged = [...imagesValue, ...newImages].filter(Boolean).slice(0, 4);
      setValue("images", merged, { shouldDirty: true, shouldValidate: true });
      setValue("imageUrl", merged[0] || imageUrlValue || "", { shouldDirty: true, shouldValidate: true });
    });
  };

  const removeImage = (index) => {
    const updated = imagesValue.filter((_, i) => i !== index);
    setValue("images", updated, { shouldDirty: true, shouldValidate: true });
    setValue("imageUrl", updated[0] || "", { shouldDirty: true, shouldValidate: true });
  };

  const addColor = () => {
    const normalized = String(colorInputValue || "").trim().toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(normalized) || colorsValue.includes(normalized) || colorsValue.length >= 20) return;
    setValue("colors", [...colorsValue, normalized], { shouldDirty: true, shouldValidate: true });
  };

  const removeColor = (index) => {
    const updated = colorsValue.filter((_, i) => i !== index);
    setValue("colors", updated, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialValues ? "Edit Product" : "Add Product"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button loading={loading} type="submit" form="product-form">
            {initialValues ? "Save Changes" : "Create Product"}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
        <Field label="Product Name" htmlFor="title" error={errors.title?.message}>
          <Input id="title" {...register("title")} />
        </Field>
        <Field label="Category" htmlFor="category" error={errors.category?.message}>
          <Select id="category" {...register("category")}>
            {[{ value: "general", label: "General" }, ...categories].map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Price" htmlFor="price" error={errors.price?.message}>
          <Input id="price" type="number" step="0.01" min="0" {...register("price")} />
        </Field>
        <Field label="Buying Price" htmlFor="costPrice" helperText="Unit cost price" error={errors.costPrice?.message}>
          <Input id="costPrice" type="number" step="0.01" min="0" {...register("costPrice")} />
        </Field>
        <Field label="Sale Price" htmlFor="salePrice" helperText="Optional promotional price" error={errors.salePrice?.message}>
          <Input id="salePrice" type="number" step="0.01" min="0" {...register("salePrice")} />
        </Field>
        <Field label="Stock Qty" htmlFor="stockQty" error={errors.stockQty?.message}>
          <Input id="stockQty" type="number" min="0" {...register("stockQty")} />
        </Field>
        <div className="md:col-span-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <label htmlFor="hasSizes" className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
            <input id="hasSizes" type="checkbox" {...register("hasSizes")} />
            This product has sizes
          </label>
          {hasSizesValue ? (
            <div className="mt-3">
              <Field
                label="Available Sizes"
                htmlFor="sizesText"
                helperText="Comma separated: 38, 39, 40 or S, M, L, XL"
                error={errors.sizesText?.message}
              >
                <Input id="sizesText" placeholder="S, M, L, XL" {...register("sizesText")} />
              </Field>
            </div>
          ) : null}
        </div>
        <div className="md:col-span-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <label htmlFor="hasColors" className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
            <input id="hasColors" type="checkbox" {...register("hasColors")} />
            This product has colors
          </label>
          {hasColorsValue ? (
            <div className="mt-3 space-y-3">
              <Field label="Add Color" htmlFor="color-input" error={errors.colors?.message}>
                <div className="flex items-center gap-2">
                  <Select
                    id="color-input"
                    value={colorInputValue}
                    onChange={(event) => setColorInputValue(event.target.value)}
                    className="w-44"
                  >
                    {COLOR_OPTIONS.map((option) => (
                      <option key={option.hex} value={option.hex}>
                        {option.name}
                      </option>
                    ))}
                  </Select>
                  <span className="h-6 w-6 rounded-full border border-slate-300" style={{ backgroundColor: colorInputValue }} />
                  <Button type="button" variant="secondary" onClick={addColor}>
                    Add
                  </Button>
                </div>
              </Field>
              {colorsValue.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {colorsValue.map((hex, index) => (
                    <button
                      key={`${hex}-${index}`}
                      type="button"
                      onClick={() => removeColor(index)}
                      className="flex items-center gap-2 px-2 py-1 text-xs text-slate-700 dark:text-slate-200"
                      title="Click to remove"
                    >
                      <span className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-700" style={{ backgroundColor: hex }} />
                      {getColorName(hex)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <Field label="Status" htmlFor="status" error={errors.status?.message}>
          <Select id="status" {...register("status")}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </Select>
        </Field>
        <Field
          label="Image URL"
          htmlFor="imageUrl"
          helperText="Optional. The first image is used as product thumbnail."
          error={errors.imageUrl?.message}
        >
          <Input id="imageUrl" {...register("imageUrl")} />
        </Field>
        <Field
          label="Upload Product Images"
          htmlFor="imageFile"
          helperText="Select up to 4 real image files from your device."
          error={errors.images?.message}
        >
          <Input id="imageFile" type="file" accept="image/*" multiple onChange={handleImageFileChange} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description" htmlFor="description" error={errors.description?.message}>
            <Textarea id="description" rows={5} {...register("description")} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field
            label="Variants JSON"
            htmlFor="variantsJson"
            helperText='Optional. Example: [{"sku":"TS-BLK-L","size":"L","color":"Black","price":1200,"stockQty":5}]'
          >
            <Textarea id="variantsJson" rows={5} {...register("variantsJson")} />
          </Field>
        </div>
        {imagesValue.length > 0 || imageUrlValue ? (
          <div className="md:col-span-2">
            <p className="mb-2 text-xs text-slate-500">Image Preview ({Math.max(imagesValue.length, imageUrlValue ? 1 : 0)}/4)</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(imagesValue.length > 0 ? imagesValue : imageUrlValue ? [imageUrlValue] : []).map((src, index) => (
                <div key={`${src.slice(0, 24)}-${index}`} className="relative">
                  <img src={src} alt={`Product preview ${index + 1}`} className="h-28 w-full rounded-xl border border-slate-200 object-cover dark:border-slate-800" />
                  {imagesValue.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-1 top-1 rounded-md bg-black/70 px-1.5 py-0.5 text-xs text-white"
                      aria-label={`Remove image ${index + 1}`}
                    >
                      x
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </form>
    </Modal>
  );
};
