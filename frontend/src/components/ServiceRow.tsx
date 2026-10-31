export type ServiceStatus = 'up' | 'down' | 'unknown';

const STATUS_LABEL: Record<ServiceStatus, string> = {
  up: 'Up',
  down: 'Down',
  unknown: 'Unknown',
};

interface ServiceRowProps {
  name: string;
  status: ServiceStatus;
  latency: string;
  note?: string;
}

export function ServiceRow({ name, status, latency, note }: ServiceRowProps) {
  return (
    <tr>
      <th scope="row">
        {name}
        {note ? <span className="note">{note}</span> : null}
      </th>
      <td>
        <span className="status" data-status={status}>
          {STATUS_LABEL[status]}
        </span>
      </td>
      <td className="num">{latency}</td>
    </tr>
  );
}
