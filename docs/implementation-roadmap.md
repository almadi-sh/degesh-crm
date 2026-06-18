# Production-ready roadmap CRM/ERP + AI (FastAPI + Frontend + Server-side Workflow)

## Цель
Построить production-ready систему, где заявка проходит полный операционный цикл (закупка, растаможка, бронирование, отгрузка, оплаты) через backend workflow в FastAPI, а frontend является клиентом доменных API. AI используется как advisory/orchestration слой и не является источником истины.

## Архитектурные принципы (обязательные)
1. **Не смешивать `request` и `process instance`.**
   - `requests` — входящая бизнес-заявка.
   - `process_instances` — экземпляр процесса вокруг заявки.
   - `process_transitions` — журнал смен состояний процесса.
   - `domain_events` — единый event log для аудита, SLA и аналитики.
2. **Только backend управляет переходами state machine.**
   - Любой transition проходит через серверные rules/checks.
   - На каждый transition пишутся `process_transition` и `domain_event`.
   - При отказе backend возвращает структурированные причины: `failed_checks`, `required_actions`.
3. **ERP/CRM — source of truth.**
   - Rule engine — источник истины для разрешённых переходов.
   - AI — только советник (advisor), не исполнитель критичных изменений.
4. **Backend не должен быть “серверным localStorage”.**
   - Переносится доменная логика и инварианты, а не просто флаги/чекбоксы.
5. **Учёт остатков — lot/batch-first.**
   - Источник истины для доступности — лоты/батчи и отдельные reservations.

---

## Этап 1. Requests + process model (foundation)
**Задача:** разделить входящие заявки и исполняемые процессы.

### Domain model
- `requests`: бизнес-контекст заявки, клиент, продуктовый интерес, сумма, канал, приоритет.
- `process_instances`: ссылка на `request_id`, тип процесса, текущая стадия(и), владелец процесса, SLA baseline.
- `process_transitions`: from_state, to_state, actor, timestamp, reason, correlation_id.
- `domain_events`: универсальные события по всем критичным действиям (transition, reservation, document verification, payment update и т.д.).

### Критерии готовности
- Одна заявка может иметь один или несколько process instances по правилам домена.
- Жизненный цикл не хранится “толстым статусом” в `requests`.
- Есть миграции, контракты API и базовые тесты на целостность связей.

---

## Этап 2. State machine + доменные статусы
**Задача:** зафиксировать управляемый workflow на сервере.

### Вариант реализации
- Для MVP допустим:
  - либо единый state machine,
  - либо раздельные `procurement_state` и `sales_state` (предпочтительно при явном расхождении веток).

### Минимальные потоки
- `procurement flow`: sourcing → contracting → customs → in_stock.
- `sales flow`: request_qualified → reservation_pending → reserved → shipment → payment_control.

### Правила
- Transition доступен только через backend endpoint/service.
- Каждая попытка transition логируется (success/fail) с причиной.
- Возврат из API: `allowed`, `failed_checks[]`, `required_actions[]`, `next_possible_states[]`.

### Критерии готовности
- Нет обхода переходов через frontend-only флаги.
- Есть unit/integration тесты на допустимые/недопустимые переходы и роли actor.

---

## Этап 3. Event log / audit / observability
**Задача:** получить воспроизводимый таймлайн и основу для аналитики.

### Что внедряем
- Единый `domain_events` со схемой: event_type, entity_type, entity_id, process_instance_id, actor_id, payload, created_at, correlation_id.
- Audit trail для всех критичных операций.
- Логирование отказов transition с категорией ошибки (rule violation / permissions / missing documents / inventory deficit).

### Зачем
- Восстановление таймлайна заявки и процесса.
- База для SLA-метрик, AI history и bottleneck analysis.
- База для post-mortem и разбора ошибок.

---

## Этап 4. Перенос workflow-сущностей из localStorage в domain backend
**Задача:** перенести смысловые сущности, а не “флаги”.

### Что переносим как доменные сущности
- `lot` / `batch`;
- `reservation`;
- `document_package`;
- `customs_checkpoints` / `shipping_checkpoints`;
- `tasks`.

### Принцип
- UI хранит только UI-state.
- Все процессные решения и инварианты — в FastAPI backend + DB constraints.

---

## Этап 5. Inventory lots + reservations (критичный контур)
**Задача:** обеспечить корректный учёт остатков и атомарное бронирование.

### Модель остатков
- Лот/батч как первичный носитель количества (`lot_id`, не только `product_id`).
- Рекомендуемые поля по количеству:
  - `quantity_total`
  - `quantity_reserved`
  - `quantity_blocked`
  - `quantity_customs_hold`
  - `quantity_shipped`
- Вычисляемый доступный остаток:
  - `available = quantity_total - quantity_reserved - quantity_blocked - quantity_customs_hold - quantity_shipped`.

### Reservations
- `reservations` — отдельная таблица с привязкой к `lot_id`, `request_id`/`process_instance_id`, actor, статусом и TTL/expiry при необходимости.
- Нельзя заменять отдельные записи простым инкрементом поля reserved.

### Конкурентный доступ и консистентность
- Row-level lock по лоту при операции резервирования.
- Транзакционность операций reserve/release/ship.
- DB CHECK constraints на неотрицательные остатки и непротиворечивые состояния.
- Идемпотентность команд (idempotency key / command key).

### Критерии готовности
- Под нагрузкой нет oversell/over-reserve.
- История резервов трассируется по событиям и actor.

---

## Этап 6. RBAC + visibility + actor-aware validation
**Задача:** ограничить доступ и действия по ролям и области видимости.

### Уровни контроля
- RBAC по ролям (sales, manager, admin, ops, finance и т.д.).
- Row-level visibility (доступ к строкам по ownership/участию/подразделению).
- Field-level restrictions для чувствительных полей (при необходимости).

### Примеры политики
- Sales: видит свои брони, свои задачи, агрегированный доступный остаток.
- Manager/Admin: видит полную картину.
- Transition валидируется не только по данным, но и по роли `actor`.

### Критерии готовности
- Нет endpoint’ов, возвращающих лишние данные вне policy.
- Проверки роли встроены в workflow rules.

---

## Этап 7. Documents + compliance gates
**Задача:** сделать документы формальным gate-механизмом процесса.

### Документы
- `documents` с lifecycle:
  - `uploaded`, `pending_review`, `accepted`, `rejected`, `expired`.
- Связи документов с process entities:
  - `request`, `lot`, `contract`, `shipment`, и др.

### Рекомендуемые поля
- `doc_type`
- `status`
- `uploaded_by`
- `verified_by`
- `verified_at`
- `storage_key`
- `original_filename`
- `checksum`
- `rejection_reason`

### Gate rules
- `required_document_rules` на переходы.
- Переходы customs/shipping разрешаются только при полном и валидированном комплекте.
- Запрет “проверки по имени файла” без верифицированного статуса.

---

## Этап 8. Tasks + notifications (event-driven)
**Задача:** развести информирование и обязательные действия.

### Разделение
- `notifications` — информационные события.
- `tasks` — action items с жизненным циклом.

### Требования к tasks
- Поля: `assignee_id`, `due_date`, `status`, `completed_at`, `source_event_id`.
- Генерация задач из `process_transitions` / `domain_events`, а не из UI-обходов.

### Критерии готовности
- Каждая критичная стадия имеет формализованный task policy.
- Просрочки и эскалации считаются на сервере.

---

## Этап 9. SLA / analytics / bottlenecks
**Задача:** управлять процессом по данным, а не вручную.

### SLA-метрики (из событий)
- `time_to_contract`
- `time_to_customs`
- `time_to_shipment`
- `payment_delay`

### Аналитика
- Воронка по статусам и причинам отказов.
- Bottleneck analysis по этапам и ролям.
- Дашборд таймлайна по `request` и `process_instance`.

### Принцип
- Источник аналитики — `domain_events` + нормализованные справочники.

---

## Этап 10. AI orchestration (advisory only)
**Задача:** встроить AI без нарушения инвариантов ERP/CRM.

### Роль AI
- Собирает факты из CRM/ERP и event timeline.
- Возвращает structured JSON, например:
  - `next_action`
  - `reason`
  - `checks_failed`
  - `risks`
- Формирует черновики решений/команд для человека.

### Логирование AI
- `ai_decisions`:
  - model
  - prompt_version
  - input_snapshot
  - output
  - latency
  - approval_status
  - approved_by / approved_at

### Жёсткие ограничения
- AI не пишет напрямую в критичные ERP-сущности.
- Применение действий только через существующие backend endpoints и business rules.
- Human-in-the-loop обязателен.
- Reproducibility обязательна: решение AI должно быть воспроизводимо по snapshot + версии промпта/модели.

### Формула ответственности
- **ERP/CRM = source of truth**
- **Rule engine = truth for transitions**
- **AI = advisor**

---

## Master data / справочники (сквозной трек для всех этапов)
**Задача:** обеспечить чистоту данных, чтобы workflow и AI не ломались на синонимах и дублях.

### Объекты
- товары;
- контрагенты;
- склады;
- сотрудники;
- договоры.

### Практики качества
- дедупликация;
- уникальные ключи;
- нормализация названий и синонимов;
- валидация ссылочной целостности и связей.

---

## Минимальный MVP scope (production-oriented)
1. `requests` + `process_instances` + `process_transitions` (без смешивания ролей таблиц).
2. Базовый state machine на backend с причинами отказов.
3. `domain_events` для всех переходов и критичных действий.
4. Lot-based inventory + отдельные `reservations` с транзакционной атомарностью.
5. Минимальный RBAC + row-level visibility.
6. Document lifecycle + required document rules для customs/shipping.
7. Tasks/notifications как event-driven сущности.
8. Базовые SLA-метрики и timeline per request/process.
9. AI advisory API + `ai_decisions` журнал + human approval.

---

## Риски / анти-паттерны
- Анти-паттерн: одна таблица `requests` хранит весь lifecycle процесса.
- Анти-паттерн: transition выполняется из frontend в обход backend rules.
- Анти-паттерн: “backend как localStorage” (перенос флагов без доменной модели).
- Анти-паттерн: резервы как одно поле `reserved_qty` без отдельной сущности.
- Анти-паттерн: документные gate’ы по имени файла/чекбоксу вместо lifecycle + verification.
- Анти-паттерн: LLM принимает финальные решения и пишет в ERP напрямую.
- Риск: плохие мастер-данные (дубли/синонимы) искажают workflow и AI-рекомендации.

---

## Что не делать на старте
- Не строить сложный BPM-редактор до фиксации базовых переходов и инвариантов.
- Не внедрять fully autonomous AI execution без human approval.
- Не оптимизировать UI-детали до стабилизации domain model и API контрактов.
- Не переносить legacy localStorage-состояния 1:1 в БД без пересборки в доменные сущности.

---

## Implementation notes (рекомендуемые следующие шаги по коду)
- Backend (FastAPI): выделить модули `workflow`, `inventory`, `documents`, `tasks`, `rbac`, `ai_orchestration`.
- DB migrations: сначала базовые process/event таблицы, затем inventory/reservations, затем documents/tasks.
- API contracts: формализовать ответы transition endpoint (`failed_checks`, `required_actions`, `next_possible_states`).
- Frontend: перейти на чтение server-side workflow state и event-driven задач, убрать критичные решения из local state.
 