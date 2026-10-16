interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h2 className="text-h1 text-text">{title}</h2>
      {description && <p className="mt-1 text-body text-text-muted">{description}</p>}
    </div>
  );
}
