import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { BadgeCheck, CircleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FlowStep {
  id: string;
  title: string;
  description: string;
  href: string;
}

interface RequestItem {
  id: string;
  title: string;
  checks: Record<string, boolean>;
}

const REQUESTS_STORAGE_KEY = "requestsListState";

const FLOW_STEPS: FlowStep[] = [
  {
    id: "supplierSearch",
    title: "Поиск контрагента",
    description: "Создайте карточку Покупателя/Поставщика/Прочие и заполните обязательные поля.",
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

const getStoredRequests = (): RequestItem[] => {
  if (typeof window === "undefined") {
    return [{ id: "request-1", title: "Закупить семена рапса", checks: {} }];
  }
  try {
    const raw = localStorage.getItem(REQUESTS_STORAGE_KEY);
    if (!raw) return [{ id: "request-1", title: "Закупить семена рапса", checks: {} }];
    const parsed = JSON.parse(raw) as RequestItem[];
    return parsed.length > 0 ? parsed : [{ id: "request-1", title: "Закупить семена рапса", checks: {} }];
  } catch {
    return [{ id: "request-1", title: "Закупить семена рапса", checks: {} }];
  }
};

const setStoredRequests = (requests: RequestItem[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
};

export default function Requests() {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId?: string }>();
  const [requests, setRequests] = useState<RequestItem[]>(() => getStoredRequests());

  const updateRequests = (updater: (current: RequestItem[]) => RequestItem[]) => {
    setRequests((current) => {
      const next = updater(current);
      setStoredRequests(next);
      return next;
    });
  };

  const activeRequest = useMemo(
    () => requests.find((request) => request.id === requestId) ?? null,
    [requestId, requests],
  );

  const steps = useMemo(
    () =>
      FLOW_STEPS.map((step, index) => {
        const prev = FLOW_STEPS[index - 1];
        const isUnlocked = !prev || !!activeRequest?.checks[prev.id];
        return {
          ...step,
          isDone: !!activeRequest?.checks[step.id],
          isUnlocked,
        };
      }),
    [activeRequest],
  );

  const toggleStep = (id: string, isUnlocked: boolean) => {
    if (!isUnlocked || !activeRequest) return;
    updateRequests((prev) => prev.map((request) => (
      request.id === activeRequest.id
        ? { ...request, checks: { ...request.checks, [id]: !request.checks[id] } }
        : request
    )));
  };

  const createRequest = () => {
    const nextRequestNumber = requests.length + 1;
    const nextRequest = {
      id: `request-${Date.now()}`,
      title: `Новая заявка #${nextRequestNumber}`,
      checks: {},
    };
    updateRequests((prev) => [...prev, nextRequest]);
    navigate(`/requests/${nextRequest.id}`);
  };

  const renameRequest = (title: string) => {
    if (!activeRequest) return;
    updateRequests((prev) => prev.map((request) => (request.id === activeRequest.id ? { ...request, title } : request)));
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display">Заявки</h1>
            <p className="mt-1 text-muted-foreground">Этапы закупки идут строго по порядку и закрываются чек-марками.</p>
          </div>
          <Button type="button" onClick={createRequest}>Создать заявку</Button>
        </div>

        {!requestId ? (
          <Card>
            <CardHeader>
              <CardTitle>Список заявок</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {requests.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => navigate(`/requests/${request.id}`)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-left transition hover:bg-muted"
                >
                  <p className="font-medium">{request.title}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        ) : !activeRequest ? (
          <Card>
            <CardContent className="p-6 space-y-3">
              <p className="text-muted-foreground">Заявка не найдена.</p>
              <Button asChild variant="outline"><Link to="/requests">Вернуться к списку</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Button asChild variant="outline"><Link to="/requests">← К списку заявок</Link></Button>
            <Card>
              <CardHeader>
                <CardTitle>Текущая заявка</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  value={activeRequest.title}
                  onChange={(event) => renameRequest(event.target.value)}
                  placeholder="Введите название заявки"
                />
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
        )}
      </div>
    </MainLayout>
  );
}
