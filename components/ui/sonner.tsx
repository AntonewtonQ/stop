"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

import styles from "./sonner.module.css"

const Toaster = ({
  className,
  closeButton,
  duration,
  mobileOffset,
  offset,
  style,
  toastOptions,
  visibleToasts,
  ...props
}: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const sonnerTheme: ToasterProps["theme"] =
    theme === "dark" ? "dark" : "light"
  const mergedToastOptions = toastOptions ?? {}

  return (
    <Sonner
      {...props}
      theme={sonnerTheme}
      className={`${styles.toaster} ${className ?? ""}`}
      closeButton={closeButton ?? true}
      duration={duration ?? 4200}
      mobileOffset={
        mobileOffset ?? {
          top: "5rem",
          right: "0.8rem",
          bottom: "1rem",
          left: "0.8rem",
        }
      }
      offset={offset ?? { top: "5.25rem", bottom: "1rem" }}
      visibleToasts={visibleToasts ?? 3}
      icons={{
        success: (
          <CircleCheckIcon />
        ),
        info: (
          <InfoIcon />
        ),
        warning: (
          <TriangleAlertIcon />
        ),
        error: (
          <OctagonXIcon />
        ),
        loading: (
          <Loader2Icon className={styles.spinner} />
        ),
      }}
      style={
        {
          "--normal-bg": "rgb(255 255 255 / 96%)",
          "--normal-text": "var(--petroleum)",
          "--normal-border": "rgb(var(--primary-rgb) / 14%)",
          "--border-radius": "1rem",
          "--success-bg": "rgb(236 253 245 / 98%)",
          "--success-border": "rgb(42 168 118 / 28%)",
          "--success-text": "#177854",
          "--info-bg": "rgb(239 246 255 / 98%)",
          "--info-border": "rgb(35 141 165 / 26%)",
          "--info-text": "#0B5D73",
          "--warning-bg": "rgb(255 251 235 / 98%)",
          "--warning-border": "rgb(240 178 74 / 42%)",
          "--warning-text": "var(--amber-deep)",
          "--error-bg": "rgb(255 241 242 / 98%)",
          "--error-border": "rgb(217 108 77 / 28%)",
          "--error-text": "#A4432C",
          ...style,
        } as React.CSSProperties
      }
      toastOptions={{
        ...mergedToastOptions,
        classNames: {
          ...mergedToastOptions.classNames,
          toast: `${styles.toast} ${mergedToastOptions.classNames?.toast ?? ""}`,
          content: `${styles.content} ${mergedToastOptions.classNames?.content ?? ""}`,
          description: `${styles.description} ${mergedToastOptions.classNames?.description ?? ""}`,
          icon: `${styles.icon} ${mergedToastOptions.classNames?.icon ?? ""}`,
          title: `${styles.title} ${mergedToastOptions.classNames?.title ?? ""}`,
        },
      }}
    />
  )
}

export { Toaster }
