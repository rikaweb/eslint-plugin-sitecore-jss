// Sixteen-case sample used by tests/integration/cli.test.ts. Expected (see the test):
// 14 element findings (12 fixable) + 4 missing-import reports (Text, Image, Link, File).
import {
  Field,
  TextField,
  RichTextField,
  ImageField,
  LinkField,
  FileField,
  RichText,
} from "@sitecore-jss/sitecore-jss-nextjs";

declare const logo: string;
declare const Typography: (props: { children?: unknown }) => unknown;

type Props = {
  fields: {
    title: Field<string>;
    heading: TextField;
    body: RichTextField;
    image: ImageField;
    link: LinkField;
    file: FileField;
  };
};

export default function Sample(props: Props) {
  const { heading } = props.fields;
  return (
    <section>
      {/* A: Field<string> baseline */}
      <h1 className="title">{props.fields.title.value}</h1>
      {/* B: TextField baseline */}
      <h2>{props.fields.heading.value}</h2>
      {/* C: optional chaining */}
      <p>{props.fields.title?.value}</p>
      {/* D: mixed children — reported, not fixed */}
      <h3>Hello {props.fields.title.value}</h3>
      {/* E: RichTextField baseline */}
      <div className="rte">{props.fields.body.value}</div>
      {/* F: dangerouslySetInnerHTML */}
      <div dangerouslySetInnerHTML={{ __html: props.fields.body.value ?? "" }} />
      {/* G: img with optional chaining */}
      <img src={props.fields.image.value?.src} alt="x" />
      {/* H: img with non-null assertion */}
      <img src={props.fields.image.value!.src} alt="y" loading="lazy" />
      {/* I: plain img — not a field */}
      <img src={logo} alt="logo" />
      {/* J: link baseline */}
      <a href={props.fields.link.value.href} className="btn">
        {props.fields.link.value.text}
      </a>
      {/* K: plain anchor — not a field */}
      <a href="/about">About</a>
      {/* L: file with optional chaining, children kept */}
      <a href={props.fields.file.value?.src}>Download</a>
      {/* M: destructured field */}
      <p>{heading.value}</p>
      {/* N: custom component wrapper — reported, not fixed */}
      <Typography>{props.fields.title.value}</Typography>
      {/* O: RichText tag="p" */}
      <RichText field={props.fields.body} tag="p" />
      {/* P: nested p */}
      <p>{props.fields.body.value}</p>
    </section>
  );
}
