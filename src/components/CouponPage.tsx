'use client';

import React from 'react';

interface CouponData {
    title: string;
    subtitle: string;
    discount: string;
    description: string;
    color: string;
    accentColor: string;
    icon: string;
}

const coupons: CouponData[] = [
    // 3 coupons for hernias
    ...Array(3).fill({
        title: 'КУПОН НА КОНСУЛЬТАЦИЮ',
        subtitle: 'Лечение грыж позвоночника',
        discount: '50%',
        description: 'Предъявите данный купон при записи на консультацию по лечению грыж позвоночника',
        color: '#0d9488',
        accentColor: '#ccfbf1',
        icon: '🦴',
    }),
    // 2 coupons for arthrosis
    ...Array(2).fill({
        title: 'КУПОН НА КОНСУЛЬТАЦИЮ',
        subtitle: 'Лечение артроза суставов',
        discount: '50%',
        description: 'Предъявите данный купон при записи на консультацию по лечению артроза суставов',
        color: '#0369a1',
        accentColor: '#e0f2fe',
        icon: '🦵',
    }),
];

interface CouponPageProps {
    doctorName?: string;
    clinicName?: string;
}

export function CouponPage({ doctorName, clinicName }: CouponPageProps) {
    return (
        <div
            className="hidden print:block"
            style={{
                pageBreakBefore: 'always',
                width: '100%',
                minHeight: '100vh',
                padding: '8mm 4mm',
                boxSizing: 'border-box',
            }}
        >
            {coupons.map((coupon, idx) => (
                <React.Fragment key={idx}>
                    {/* Cut line between coupons */}
                    {idx > 0 && (
                        <div
                            style={{
                                borderTop: '2px dashed #9ca3af',
                                margin: '0 0',
                                position: 'relative',
                                height: '0',
                            }}
                        >
                            <span
                                style={{
                                    position: 'absolute',
                                    left: '-2mm',
                                    top: '-8px',
                                    fontSize: '14px',
                                    color: '#9ca3af',
                                }}
                            >
                                ✂
                            </span>
                        </div>
                    )}

                    {/* Coupon */}
                    <div
                        style={{
                            border: `2px solid ${coupon.color}`,
                            borderRadius: '12px',
                            padding: '12px 20px',
                            margin: idx === 0 ? '0 0 4px 0' : '4px 0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            height: 'calc((100vh - 16mm - 40px) / 5 - 8px)',
                            boxSizing: 'border-box',
                            background: `linear-gradient(135deg, ${coupon.accentColor} 0%, white 40%)`,
                        }}
                    >
                        {/* Icon */}
                        <div
                            style={{
                                fontSize: '40px',
                                lineHeight: 1,
                                flexShrink: 0,
                            }}
                        >
                            {coupon.icon}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    letterSpacing: '2px',
                                    color: coupon.color,
                                    textTransform: 'uppercase',
                                    marginBottom: '2px',
                                }}
                            >
                                {coupon.title}
                            </div>
                            <div
                                style={{
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    color: '#1f2937',
                                    marginBottom: '4px',
                                }}
                            >
                                {coupon.subtitle}
                            </div>
                            <div
                                style={{
                                    fontSize: '11px',
                                    color: '#6b7280',
                                    lineHeight: 1.3,
                                }}
                            >
                                {coupon.description}
                            </div>
                            <div
                                style={{
                                    fontSize: '10px',
                                    color: '#9ca3af',
                                    marginTop: '4px',
                                    display: 'flex',
                                    gap: '16px',
                                }}
                            >
                                {doctorName && <span>Врач: {doctorName}</span>}
                                {clinicName && <span>{clinicName}</span>}
                                <span>Дата: ___.___.______</span>
                            </div>
                        </div>

                        {/* Discount badge */}
                        <div
                            style={{
                                flexShrink: 0,
                                width: '90px',
                                height: '90px',
                                borderRadius: '50%',
                                background: coupon.color,
                                color: 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{ fontSize: '10px', fontWeight: 600, opacity: 0.9 }}>СКИДКА</div>
                            <div style={{ fontSize: '28px', fontWeight: 900, lineHeight: 1 }}>{coupon.discount}</div>
                        </div>
                    </div>
                </React.Fragment>
            ))}
        </div>
    );
}
