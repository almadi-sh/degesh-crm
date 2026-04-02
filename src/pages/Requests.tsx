import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { BadgeCheck, CircleAlert } from "lucide-react";

interface FlowStep {
  id: string;
  title: string;
  description: string;
  href: string;
}

const FLOW_STEPS: FlowStep[] = [
  {
    id: "supplierSearch",
    title: "Поиск контрагента",
    description: "Создайте карточку Покупателя/Поставщика/Прочее и заполните обязательные поля.",
    href: "/suppliers",
  },
  {
    id: "goodsRegistration",
    title: "Регистрация товаров",
    description: "Выберите поставщика, добавьте товар и чекпоинты договора/документов/растаможки.",
    href: "/supplier-cards",
  },
  {
    id: "reservationRelease",
    title: "Разблокировка броней",
    description: "После статуса «Готово к растаможке» бронь получает статус «Готов к реализации».",
    href: "/reservations",
  },
];

export default function Requests() {
  const [requestTitle, setRequestTitle] = useState("Закупить семена рапса");
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const steps = useMemo(
    () =>
      FLOW_STEPS.map((step, index) => {
        const prev = FLOW_STEPS[index - 1];
        const isUnlocked = !prev || checks[prev.id];
        return {
          ...step,
          isDone: !!checks[step.id],
          isUnlocked,
        };
      }),
    [checks],
  );

  const toggleStep = (id: string, isUnlocked: boolean) => {
    if (!isUnlocked) return;
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">Заявка</h1>
          <p className="mt-1 text-muted-foreground">Этапы закупки идут строго по порядку и закрываются чек-марками.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Текущая заявка</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{requestTitle}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flow / To-do</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-medium">{index + 1}. {step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {step.isDone ? <BadgeCheck className="h-5 w-5 text-emerald-600" /> : <CircleAlert className="h-5 w-5 text-amber-500" />}
                    <Checkbox checked={step.isDone} onCheckedChange={() => toggleStep(step.id, step.isUnlocked)} disabled={!step.isUnlocked} />
                  </div>
                </div>
                <div className="mt-3">
                  <Button asChild variant={step.isUnlocked ? "default" : "secondary"} disabled={!step.isUnlocked}>
                    <Link to={step.href}>{step.isUnlocked ? "Перейти к этапу" : "Сначала завершите предыдущий этап"}</Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
