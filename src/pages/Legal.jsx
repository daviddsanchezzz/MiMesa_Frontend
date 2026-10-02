import { Link, useParams } from 'react-router-dom';

/*
 * Legal texts shown to businesses when they join Vetra (version below must
 * match LEGAL_VERSION in the backend: core/lib/legal.js).
 *
 * DRAFT prepared as a starting point. The data in [BRACKETS] must be filled in
 * and the texts reviewed by a lawyer/gestoría before relying on them.
 */
const VERSION = '30 de septiembre de 2026';
const OWNER = {
  name: '[RAZÓN SOCIAL O NOMBRE DEL TITULAR]',
  nif: '[NIF]',
  address: '[DOMICILIO]',
  email: '[EMAIL DE CONTACTO]',
  city: '[CIUDAD]',
};

const H = ({ children }) => <h2 className="text-lg font-bold text-gray-900 mt-8 mb-2">{children}</h2>;
const P = ({ children }) => <p className="text-sm text-gray-700 leading-relaxed mb-3">{children}</p>;
const UL = ({ items }) => <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-700 leading-relaxed mb-3">{items.map((i) => <li key={i}>{i}</li>)}</ul>;

const SUBPROCESSORS = [
  'Railway Corporation (alojamiento del servidor).',
  'MongoDB, Inc. — MongoDB Atlas (base de datos).',
  'Vercel Inc. (alojamiento de la aplicación web).',
  'Resend (Plus Five Five, Inc.) (envío de emails).',
  'Stripe Payments Europe, Ltd. (cobro de suscripciones y, si el negocio lo activa, de señales).',
  'Google LLC (inicio de sesión con Google, solo si el usuario lo elige).',
];

function Terms() {
  return (
    <>
      <P>Estas condiciones regulan el uso de Vetra, un servicio de software para gestionar reservas, agenda, clientes, caja y otras funciones de negocios (en adelante, el «Servicio»), prestado por {OWNER.name}, con NIF {OWNER.nif} y domicilio en {OWNER.address} («Vetra»). Al crear o activar una cuenta, el negocio (el «Cliente») y las personas que lo usan aceptan estas condiciones.</P>
      <H>1. El Servicio</H>
      <P>Vetra ofrece una aplicación web accesible desde navegador y móvil, con las funciones incluidas en el plan contratado. Vetra puede mejorar, cambiar o retirar funciones, avisando con antelación razonable cuando el cambio afecte de forma importante al uso del Cliente.</P>
      <H>2. Cuentas y acceso</H>
      <UL items={[
        'El Cliente es responsable de la veracidad de sus datos y de las personas a las que da acceso (equipo), así como de sus permisos.',
        'Cada usuario debe custodiar su contraseña. El Cliente avisará a Vetra si sospecha de un acceso no autorizado.',
        'Vetra puede crear la cuenta del negocio a petición del Cliente; el titular la activa aceptando estas condiciones.',
      ]} />
      <H>3. Uso aceptable</H>
      <P>El Cliente se compromete a usar el Servicio de forma lícita y, en particular, a no enviar comunicaciones comerciales a quien no lo permita la ley, no introducir datos que no tenga derecho a tratar, no intentar acceder a datos de otros clientes ni afectar al funcionamiento del Servicio.</P>
      <H>4. Precio y pago</H>
      <P>El precio es el del plan elegido, publicado en la web o acordado por escrito, más los impuestos aplicables. Se cobra por adelantado de forma periódica. Si un pago no se completa, Vetra podrá limitar el Servicio tras avisar al Cliente. Los periodos de prueba gratuitos, si los hay, se indican al contratar.</P>
      <H>5. Duración y baja</H>
      <P>El contrato dura mientras la suscripción esté activa. El Cliente puede darse de baja cuando quiera; la baja surte efecto al final del periodo pagado, sin reembolso proporcional salvo que la ley lo exija. Tras la baja, el Cliente puede pedir una exportación de sus datos durante 30 días; después se eliminarán según el Contrato de encargo del tratamiento.</P>
      <H>6. Disponibilidad y soporte</H>
      <P>Vetra pondrá medios razonables para que el Servicio esté disponible y hará copias de seguridad periódicas, pero no garantiza un funcionamiento ininterrumpido. El soporte se presta por email en horario laborable.</P>
      <H>7. Datos personales</H>
      <P>Los datos de los clientes del negocio, de su equipo y demás que el Cliente introduce en Vetra son responsabilidad del Cliente; Vetra los trata solo por su cuenta, como encargado del tratamiento, según el <Link to="/legal/encargo" className="text-violet-700 underline">Contrato de encargo del tratamiento</Link>, que forma parte de estas condiciones. Los datos de los propios usuarios de Vetra se tratan según la <Link to="/legal/privacidad" className="text-violet-700 underline">Política de privacidad</Link>.</P>
      <H>8. Propiedad intelectual</H>
      <P>Vetra y su software pertenecen a {OWNER.name}. El Cliente recibe un derecho de uso no exclusivo mientras dure el contrato. Los datos del Cliente son del Cliente.</P>
      <H>9. Responsabilidad</H>
      <P>Vetra responde de los daños que cause por incumplimiento doloso o negligencia grave. En otros casos, y salvo lo que la ley no permita limitar, la responsabilidad total de Vetra se limita a lo pagado por el Cliente en los 12 meses anteriores al hecho. Vetra no responde de lucro cesante ni de decisiones del Cliente basadas en el Servicio.</P>
      <H>10. Cambios en las condiciones</H>
      <P>Vetra puede actualizar estas condiciones avisando con al menos 30 días de antelación. Si el Cliente no está de acuerdo, puede darse de baja antes de que entren en vigor.</P>
      <H>11. Ley y jurisdicción</H>
      <P>Se aplica la ley española. Para cualquier conflicto, las partes se someten a los juzgados y tribunales de {OWNER.city}, salvo que la ley establezca otro fuero.</P>
    </>
  );
}

function Privacy() {
  return (
    <>
      <P>Esta política explica cómo trata {OWNER.name} («Vetra») los datos de las personas que usan Vetra o contactan con nosotros.</P>
      <H>1. Responsable</H>
      <P>{OWNER.name}, NIF {OWNER.nif}, {OWNER.address}. Contacto: {OWNER.email}.</P>
      <H>2. Qué datos tratamos y para qué</H>
      <UL items={[
        'Usuarios de Vetra (dueños y equipo de los negocios): nombre, email, teléfono, datos de acceso y uso de la aplicación, para prestar el Servicio, darte soporte y avisarte de cambios importantes. Base: el contrato.',
        'Datos de facturación del negocio, para cobrar la suscripción y cumplir obligaciones fiscales. Base: contrato y obligación legal.',
        'Personas que solicitan acceso o nos escriben: los datos del formulario, para responder y, si procede, preparar la cuenta. Base: su solicitud (medidas precontractuales).',
        'Seguridad y mejora del servicio: registros técnicos (IP, navegador), por nuestro interés legítimo en proteger el servicio.',
      ]} />
      <P>Los datos que cada negocio introduce sobre sus propios clientes (por ejemplo, las personas que reservan) son responsabilidad de ese negocio; Vetra solo los trata por su cuenta como encargado del tratamiento. Si reservaste en un negocio y quieres ejercer tus derechos, dirígete a él.</P>
      <H>3. Cuánto tiempo</H>
      <P>Mientras dure la relación y, después, el tiempo necesario para cumplir obligaciones legales (por ejemplo, fiscales) o atender posibles reclamaciones.</P>
      <H>4. Con quién los compartimos</H>
      <P>Con los proveedores que necesitamos para prestar el servicio, que actúan como encargados del tratamiento:</P>
      <UL items={SUBPROCESSORS} />
      <P>Algunos están fuera del Espacio Económico Europeo (Estados Unidos). En esos casos las transferencias se amparan en el Marco de Privacidad de Datos UE-EE. UU. o en cláusulas contractuales tipo de la Comisión Europea. No vendemos datos a terceros.</P>
      <H>5. Tus derechos</H>
      <P>Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a {OWNER.email}. Si crees que no hemos atendido bien tu solicitud, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).</P>
    </>
  );
}

function Dpa() {
  return (
    <>
      <P>Este contrato, conforme al artículo 28 del Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018, regula el tratamiento de datos personales que {OWNER.name} («el Encargado») realiza por cuenta del negocio que usa Vetra («el Responsable»). Forma parte de las Condiciones de uso y se acepta al activar la cuenta del negocio.</P>
      <H>1. Objeto, naturaleza y finalidad</H>
      <P>El Encargado trata los datos necesarios para prestar el Servicio Vetra: almacenar y gestionar reservas y citas, fichas de clientes, comunicaciones con ellos (confirmaciones, recordatorios y, si el Responsable lo activa, avisos comerciales), caja, equipo y demás funciones que el Responsable use.</P>
      <H>2. Datos e interesados</H>
      <UL items={[
        'Interesados: clientes del Responsable, su personal y personas de contacto.',
        'Datos: identificativos y de contacto (nombre, teléfono, email), historial de reservas y citas, preferencias y notas que el Responsable introduzca, importes cobrados y, del personal, datos laborales básicos (horarios, retribución y pagos si usa esas funciones).',
        'El Responsable no introducirá categorías especiales de datos (por ejemplo, salud) salvo que sea imprescindible y lo haya valorado bajo su responsabilidad.',
      ]} />
      <H>3. Duración</H>
      <P>Mientras el Responsable use el Servicio. Al terminar, el Encargado permitirá exportar los datos durante 30 días y después los suprimirá, incluidas las copias de seguridad en su ciclo normal de rotación, salvo obligación legal de conservarlos.</P>
      <H>4. Obligaciones del Encargado</H>
      <UL items={[
        'Tratar los datos solo siguiendo las instrucciones documentadas del Responsable (el uso que hace del Servicio y su configuración), y no para fines propios.',
        'Garantizar que las personas autorizadas a tratar los datos se han comprometido a la confidencialidad.',
        'Aplicar medidas técnicas y organizativas adecuadas (art. 32 RGPD): cifrado en tránsito, control de acceso por roles, contraseñas almacenadas cifradas, copias de seguridad y separación de los datos de cada negocio.',
        'Ayudar al Responsable a atender los derechos de los interesados y a cumplir sus obligaciones de seguridad, evaluaciones de impacto y consultas.',
        'Notificar al Responsable sin dilación indebida, y en todo caso en un máximo de 48 horas desde que tenga constancia, cualquier violación de seguridad que afecte a sus datos, con la información disponible.',
        'Poner a disposición del Responsable la información necesaria para demostrar el cumplimiento y permitir auditorías razonables, con preaviso y a su cargo.',
      ]} />
      <H>5. Subencargados</H>
      <P>El Responsable autoriza al Encargado a recurrir a los siguientes subencargados, que ofrecen garantías equivalentes a las de este contrato:</P>
      <UL items={SUBPROCESSORS} />
      <P>El Encargado informará de cualquier cambio en esta lista con al menos 15 días de antelación; el Responsable podrá oponerse y, si no hay alternativa, darse de baja. Las transferencias fuera del EEE se amparan en el Marco de Privacidad de Datos UE-EE. UU. o en cláusulas contractuales tipo.</P>
      <H>6. Obligaciones del Responsable</H>
      <UL items={[
        'Contar con base legal para tratar los datos que introduce e informar a los interesados (por ejemplo, en su web, en el mostrador o en los textos que Vetra muestra al reservar).',
        'Activar las comunicaciones comerciales solo cuando la ley lo permita y respetar las bajas.',
        'Gestionar los permisos de su equipo y mantener seguras sus credenciales.',
      ]} />
      <H>7. Responsabilidad</H>
      <P>Cada parte responde de sus incumplimientos conforme al RGPD. Se aplican las limitaciones de las Condiciones de uso en lo que la ley permita.</P>
    </>
  );
}

const DOCS = {
  condiciones: { title: 'Condiciones de uso', Body: Terms },
  privacidad: { title: 'Política de privacidad', Body: Privacy },
  encargo: { title: 'Contrato de encargo del tratamiento', Body: Dpa },
};

export default function Legal() {
  const { doc } = useParams();
  const d = DOCS[doc] || DOCS.condiciones;
  const { Body } = d;
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl p-6 sm:p-10">
        <div className="flex items-center gap-2 mb-6">
          <img src="/logo.svg" alt="Vetra" className="w-8 h-8" />
          <span className="font-bold text-gray-900">Vetra</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{d.title}</h1>
        <p className="text-xs text-gray-400 mt-1 mb-6">Versión del {VERSION}</p>
        <Body />
        <div className="flex flex-wrap gap-x-5 gap-y-2 pt-6 mt-8 border-t border-gray-100 text-sm">
          {Object.entries(DOCS).filter(([k]) => k !== doc).map(([k, v]) => (
            <Link key={k} to={`/legal/${k}`} className="text-violet-700 font-medium">{v.title}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
